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

const handleSquarePaymentCompleted = async payload => {
    const session = {
        startTime: new Date(),
        metadata: {
            orderId: null,
            userId: null
        }
    };
    
    try {
        console.log('Processing payment.updated webhook', {
            paymentId: payload.id,
            status: payload.status
        });

        // Extract order ID and user ID from payment note
        const noteMatch = payload.note ? payload.note.match(/Order ID: ([^,]+)/) : null;
        const userIdMatch = payload.note ? payload.note.match(/User ID: ([^,]+)/) : null;
        
        if (!noteMatch || !userIdMatch) {
            console.error('Missing metadata in payment note:', payload.note);
            throw new Error('Missing required metadata: orderId or userId');
        }
        
        const orderId = noteMatch[1];
        const userId = userIdMatch[1];
        
        session.metadata = { orderId, userId };

        const amount = payload.amount_money.amount / 100;
        console.log(`Processing payment of $${amount} for order ${orderId}`);

        // Find user and order in parallel
        const [user, order] = await Promise.all([
            userService.getUserById(userId),
            orderService.getOrderById(orderId)
        ]);

        if (!user || !order) {
            console.error('User or order not found:', { userId, orderId });
            throw new Error('User or order not found');
        }

        console.log('Found user and order:', { 
            userId: user._id, 
            orderId: order._id,
            currentOrderStatus: order.status,
            currentPaymentStatus: order.paymentStatus
        });

        const orderUpdate = {
            status: "placed",
            paymentStatus: "paid",
            paymentDate: new Date()
        };
        
        // Create payment record with payment ID
        const payment = await paymentService.create({
            user: userId,
            order: orderId,
            checkoutSessionId: payload.id,
            amount,
            currency: payload.amount_money.currency,
            customer: {
                id: payload.customer_id,
                email: payload.buyer_email,
            },
            paymentStatus: 'succeeded',
        });

        if (!payment) {
            console.error('Failed to create payment record');
            throw new Error('Failed to create payment record');
        }

        console.log('Created payment record:', { 
            paymentId: payment._id,
            status: payment.paymentStatus
        });

        // Add payment reference to order update
        orderUpdate.payment = payment._id;

        // Update order with payment details using orderService
        const updatedOrder = await orderService.updateOrderById(orderId, orderUpdate);

        console.log('Updated order with payment:', { 
            orderId: updatedOrder._id,
            status: updatedOrder.status,
            paymentStatus: updatedOrder.paymentStatus
        });

        // Send confirmation emails
        const html = await ejs.renderFile(path.join(__dirname, '../views/mail.ejs'), {
            customerName: user.name ?? "",
            orderNumber: updatedOrder.orderNo,
            amount: amount,
            date: new Date().toLocaleDateString()
        });
        
        const baseUrl = config.env === 'production' 
            ? "https://metabolixmd.com/admin"
            : "http://localhost:3000/admin";

        const adminHtml = await ejs.renderFile(path.join(__dirname, '../views/adminMail.ejs'), {
            orderNumber: updatedOrder.orderNo,
            customerName: user.name ?? "",
            customerEmail: user.email,
            amount: amount,
            date: new Date().toLocaleDateString(),
            customerAddress: updatedOrder.deliveryAddress?.street,
            city: updatedOrder.deliveryAddress?.city,
            state: updatedOrder.deliveryAddress?.state,
            zipCode: updatedOrder.deliveryAddress?.postalCode,
            trackingLink: `${baseUrl}/orders`
        });

        await Promise.all([
            sendEmail({
                to: user.email,
                subject: `Payment Confirmed - MetabolixMD Order #${updatedOrder.orderNo}`,
                html: html,
            }),
            sendEmail({
                to: config.adminMail,
                subject: `New Paid Order #${updatedOrder.orderNo} from ${user.name ?? ""} - $${amount}`,
                html: adminHtml
            }),
            // Send SMS notifications
            sendOrderStatusUpdate(updatedOrder, user, 'paymentReceived')
        ]);

        console.log('Payment process completed successfully');
        
        return { 
            success: true, 
            payment: payment._id, 
            order: updatedOrder._id,
            processingTime: new Date() - session.startTime
        };
    } catch (err) {
        console.error('Error processing webhook:', {
            error: err.message,
            stack: err.stack,
            processingTime: new Date() - session.startTime
        });
        throw err;
    }
};

const processWebhook = catchAsync(async (req, res) => {
    console.log('Received webhook request:', {
        path: req.path,
        method: req.method,
        headers: req.headers['square-signature']
    });

    if (!req.body || !req.headers['square-signature']) {
        console.error('Missing webhook body or signature');
        return res.status(400).json({ 
            received: false,
            error: 'Missing webhook body or signature'
        });
    }

    try {
        const squareEvent = squareService.verifyWebhookSignature(
            req.rawBody || JSON.stringify(req.body),
            req.headers['square-signature']
        );
        
        console.log(`Processing Square event: ${squareEvent.type}`);
        
        switch (squareEvent.type) {
            case 'payment.updated':
                const payment = squareEvent.data.object.payment;
                if (payment.status === 'COMPLETED') {
                    const result = await handleSquarePaymentCompleted(payment);
                    console.log('Payment processed successfully:', result);
                } else {
                    console.log(`Payment status is ${payment.status}, not processing further`);
                }
                break;

            default:
                console.log(`Unhandled webhook event type: ${squareEvent.type}`);
        }

        res.status(200).json({ received: true });
    } catch (err) {
        console.error('Webhook processing error:', err);
        res.status(200).json({ 
            received: true,
            error: err.message
        });
    }
});

module.exports = {
    processWebhook
}