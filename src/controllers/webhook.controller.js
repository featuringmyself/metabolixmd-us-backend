const { default: mongoose } = require("mongoose");
const { paymentService, userService, orderService } = require("../services");
const { squareService } = require("../microservices");
const catchAsync = require("../utils/catchAsync");
const { sendEmail } = require("../microservices/mail.service");
const ejs = require('ejs');
const path = require('path');
const config = require("../config/config");
const { sendOrderStatusUpdate } = require("../microservices/sms.service");
const httpStatus = require("http-status");
const { sendSMSToContacts } = require("../microservices/sms.service");

const handleSquarePaymentCompleted = async (payload) => {
    const session = {
        startTime: new Date(),
        metadata: {
            orderId: null,
            userId: null
        }
    };
    
    try {
        console.log('--- [WEBHOOK] Processing completed payment:', {
            paymentId: payload.id,
            orderId: payload.order_id,
            amount: payload.amount_money.amount,
            status: payload.status
        });

        let orderId, userId;

        // First try to get metadata from order if order_id exists
        if (payload.order_id) {
            try {
                const orderResponse = await squareService.getOrder(payload.order_id);
                if (orderResponse && orderResponse.metadata) {
                    orderId = orderResponse.metadata.orderId;
                    userId = orderResponse.metadata.userId;
                    console.log('--- [WEBHOOK] Retrieved metadata from Square order:', { orderId, userId });
                }
            } catch (err) {
                console.warn('--- [WEBHOOK] Failed to retrieve order from Square:', err.message);
            }
        }

        // Fallback to extracting from payment note
        if (!orderId || !userId) {
            const noteMatch = payload.note ? payload.note.match(/Order ID: ([^,]+)/) : null;
            const userIdMatch = payload.note ? payload.note.match(/User ID: ([^,]+)/) : null;
            
            console.log('--- [WEBHOOK] Extracted from note:', { noteMatch, userIdMatch });
            
            if (!noteMatch || !userIdMatch) {
                console.error('--- [WEBHOOK] Missing metadata in payment note:', payload.note);
                throw new Error('Missing required metadata: orderId or userId not found in payment note or order metadata');
            }
            
            orderId = noteMatch[1];
            userId = userIdMatch[1];
        }

        session.metadata = { orderId, userId };
        const amount = payload.amount_money.amount / 100;
        
        console.log(`--- [WEBHOOK] Processing payment of $${amount} for order ${orderId}, user ${userId}`);

        // Check if payment already processed (idempotency)
        const existingPayment = await paymentService.getPaymentByCheckoutSessionId(payload.id);
        if (existingPayment) {
            console.log('--- [WEBHOOK] Payment already processed:', {
                existingPaymentId: existingPayment._id,
                paymentId: payload.id
            });
            return { 
                success: true, 
                alreadyProcessed: true,
                payment: existingPayment._id,
                processingTime: new Date() - session.startTime
            };
        }

        // Find user and order in parallel
        const [user, order] = await Promise.all([
            userService.getUserById(userId),
            orderService.getOrderById(orderId)
        ]);

        if (!user) {
            console.error('--- [WEBHOOK] User not found:', userId);
            throw new Error(`User not found: ${userId}`);
        }

        if (!order) {
            console.error('--- [WEBHOOK] Order not found:', orderId);
            throw new Error(`Order not found: ${orderId}`);
        }

        console.log('--- [WEBHOOK] Found user and order:', { 
            userId: user._id, 
            orderId: order._id,
            currentOrderStatus: order.status,
            currentPaymentStatus: order.paymentStatus,
            userEmail: user.email,
            orderNumber: order.orderNo
        });

        // Validate payment amount matches order total
        if (Math.abs(order.totalAmount - amount) > 0.01) {
            console.error('--- [WEBHOOK] Payment amount mismatch:', {
                paymentAmount: amount,
                orderAmount: order.totalAmount,
                difference: Math.abs(order.totalAmount - amount)
            });
            throw new Error(`Payment amount mismatch: expected ${order.totalAmount}, received ${amount}`);
        }

        // Use database transaction for consistency
        const dbSession = await mongoose.startSession();
        let payment, updatedOrder;

        try {
            await dbSession.withTransaction(async () => {
                // Create payment record
                console.log('--- [WEBHOOK] Creating payment record...');
                payment = await paymentService.create({
                    user: userId,
                    order: orderId,
                    checkoutSessionId: payload.id,
                    amount,
                    currency: payload.amount_money.currency,
                    customer: {
                        id: payload.customer_id,
                        email: payload.buyer_email_address || payload.buyer_email,
                    },
                    paymentStatus: 'paid', // Use 'paid' instead of 'succeeded' for consistency
                    squarePaymentId: payload.id,
                    paymentMethod: 'square',
                    createdAt: new Date(payload.created_at)
                }, { session: dbSession });

                console.log('--- [WEBHOOK] Created payment record:', payment._id);

                // Update order status
                const orderUpdate = {
                    status: "placed",
                    paymentStatus: "paid",
                    paymentDate: new Date(),
                    payment: payment._id
                };

                console.log('--- [WEBHOOK] Updating order with:', orderUpdate);
                updatedOrder = await orderService.updateOrderById(
                    orderId, 
                    orderUpdate, 
                    { session: dbSession }
                );

                console.log('--- [WEBHOOK] Updated order:', updatedOrder._id);
            });
        } finally {
            await dbSession.endSession();
        }

        // Send notifications (outside transaction to avoid blocking)
        try {
            await sendNotifications(user, updatedOrder, amount);
        } catch (notificationError) {
            console.error('--- [WEBHOOK] Notification error (non-blocking):', notificationError.message);
            // Don't throw - payment was successful, notifications are secondary
        }

        console.log('--- [WEBHOOK] Payment process completed successfully', {
            orderId: updatedOrder._id,
            paymentId: payment._id,
            userId: user._id,
            processingTime: new Date() - session.startTime
        });

        return { 
            success: true, 
            payment: payment._id, 
            order: updatedOrder._id,
            processingTime: new Date() - session.startTime
        };

    } catch (err) {
        console.error('--- [WEBHOOK] Error processing payment webhook:', {
            error: err.message,
            stack: err.stack,
            processingTime: new Date() - session.startTime,
            metadata: session.metadata,
            paymentData: {
                paymentId: payload.id,
                orderId: payload.order_id,
                status: payload.status,
                amount: payload.amount_money?.amount
            }
        });
        throw err;
    }
};

const sendNotifications = async (user, order, amount) => {
    console.log('--- [WEBHOOK] Sending notifications...');
    
    const baseUrl = config.env === 'production' 
        ? "https://metabolixmd.com/admin"
        : "http://localhost:3000/admin";

    // Render email templates
    const [customerHtml, adminHtml] = await Promise.all([
        ejs.renderFile(path.join(__dirname, '../views/mail.ejs'), {
            customerName: user.name || "Valued Customer",
            orderNumber: order.orderNo,
            amount: amount,
            date: new Date().toLocaleDateString()
        }),
        ejs.renderFile(path.join(__dirname, '../views/adminMail.ejs'), {
            orderNumber: order.orderNo,
            customerName: user.name || "Unknown",
            customerEmail: user.email,
            amount: amount,
            date: new Date().toLocaleDateString(),
            customerAddress: order.deliveryAddress?.street || 'N/A',
            city: order.deliveryAddress?.city || 'N/A',
            state: order.deliveryAddress?.state || 'N/A',
            zipCode: order.deliveryAddress?.postalCode || 'N/A',
            trackingLink: `${baseUrl}/orders`
        })
    ]);

    // Send all notifications in parallel
    const notifications = [
        sendEmail({
            to: user.email,
            subject: `Payment Confirmed - MetabolixMD Order #${order.orderNo}`,
            html: customerHtml,
        }),
        sendEmail({
            to: config.adminMail,
            subject: `New Paid Order #${order.orderNo} from ${user.name || "Unknown"} - $${amount}`,
            html: adminHtml
        })
    ];

    // Add SMS notification if phone number exists
    if (user.phone) {
        notifications.push(sendOrderStatusUpdate(order, user, 'paymentReceived'));
    }

    // Send SMS to admin on payment received
    notifications.push(
        sendSMSToContacts(
            [{phone: config.clientPhone}, {phone: config.clientPhone2}],
            `[Admin] Payment received for order #${order.orderNo} from ${user.name || "Unknown"} - $${amount}`
        )
    );

    await Promise.allSettled(notifications);
    console.log('--- [WEBHOOK] Notifications sent');
};

const handleWebhook = catchAsync(async (req, res) => {
    console.log('--- [WEBHOOK] Received webhook request ---');
    console.log('Path:', req.path);
    console.log('Method:', req.method);
    console.log('Headers:', {
        'square-signature': req.headers['square-signature'],
        'x-square-hmacsha256-signature': req.headers['x-square-hmacsha256-signature'],
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
    });

    // Get both possible signature headers
    const signatureHeaders = {
        'x-square-signature': req.headers['x-square-signature'],
        'x-square-hmacsha256-signature': req.headers['x-square-hmacsha256-signature']
    };
    
    if (!req.rawBody || (!signatureHeaders['x-square-signature'] && !signatureHeaders['x-square-hmacsha256-signature'])) {
        console.error('--- [WEBHOOK] Missing webhook body or signature');
        return res.status(400).json({ 
            received: false,
            error: 'Missing webhook body or signature'
        });
    }

    // Use the exact notification URL from Square dashboard (match the logs)
    const notificationUrl = config.square.webhookUrl || 'https://api.metabolixmd.com/webhooks/';
    
    try {
        console.log('--- [WEBHOOK] Verifying Square webhook signature...');
        console.log('Using notification URL:', notificationUrl);
        console.log('Raw body length:', req.rawBody.length);
        console.log('Available signatures:', signatureHeaders);
        
        const squareEvent = squareService.verifyWebhookSignature(
            req.rawBody, // Use the raw body string we captured
            signatureHeaders, // Pass both signature headers
            notificationUrl
        );
        
        console.log('--- [WEBHOOK] Signature verified successfully');
        console.log(`--- [WEBHOOK] Processing Square event: ${squareEvent.type}`);
        console.log('Event metadata:', {
            eventId: squareEvent.event_id,
            merchantId: squareEvent.merchant_id,
            createdAt: squareEvent.created_at
        });

        // Process different event types
        switch (squareEvent.type) {
            case 'payment.updated':
                await handlePaymentUpdated(squareEvent.data.object.payment);
                break;
                
            case 'order.updated':
                await handleOrderUpdated(squareEvent.data.object.order);
                break;
                
            default:
                console.log(`--- [WEBHOOK] Unhandled webhook event type: ${squareEvent.type}`, {
                    eventId: squareEvent.event_id,
                    merchantId: squareEvent.merchant_id
                });
        }

        // Always return 200 for successful webhook processing
        res.status(200).json({ 
            received: true,
            eventType: squareEvent.type,
            eventId: squareEvent.event_id
        });

    } catch (err) {
        console.error('--- [WEBHOOK] Webhook processing error:', {
            error: err.message,
            stack: err.stack,
            headers: req.headers
        });

        // Return 200 even on errors to prevent Square from retrying
        // Log the error but don't fail the webhook
        res.status(200).json({ 
            received: true,
            error: err.message,
            note: 'Error logged but webhook acknowledged'
        });
    }
});

const handlePaymentUpdated = async (payment) => {
    console.log('--- [WEBHOOK] payment.updated event:', {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount_money?.amount
    });

    if (payment.status === 'COMPLETED') {
        const result = await handleSquarePaymentCompleted(payment);
        console.log('--- [WEBHOOK] Payment processed successfully:', result);
    } else {
        console.log(`--- [WEBHOOK] Payment status is ${payment.status}, not processing further`, {
            paymentId: payment.id,
            orderId: payment.order_id,
            status: payment.status
        });
    }
};

const handleOrderUpdated = async (order) => {
    console.log('--- [WEBHOOK] order.updated event:', {
        orderId: order.id,
        state: order.state,
        totalMoney: order.total_money
    });

    // Handle order state changes if needed
    if (order.state === 'COMPLETED') {
        console.log('--- [WEBHOOK] Order completed:', order.id);
        // Add any order completion logic here
    }
};

module.exports = {
    handleWebhook,
    handleSquarePaymentCompleted // Export for testing
};