const { default: mongoose } = require("mongoose");
const { paymentService, userService, orderService } = require("../services");
const { stripeService } = require("../microservices");
const catchAsync = require("../utils/catchAsync");
const { sendEmail } = require("../microservices/mail.service");
const ejs = require('ejs');
const path = require('path');
const config = require("../config/config");
const { sendOrderStatusUpdate } = require("../microservices/sms.service");
const httpStatus = require("http-status");

const handleStripeCheckoutSessionCompleted = async payload => {
    const session = {
        startTime: new Date(),
        metadata: payload.metadata
    };
    
    try {
        console.log('Processing checkout.session.completed webhook', {
            payloadId: payload.id,
            metadata: payload.metadata
        });

        const { userId, orderId } = payload.metadata;
        if (!userId || !orderId) {
            console.error('Missing metadata in webhook:', payload);
            throw new Error('Missing required metadata: userId or orderId');
        }

        const amount = payload.amount_total / 100;
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
        
        // Create payment record with session ID and intent
        const payment = await paymentService.create({
            user: userId,
            order: orderId,
            checkoutSessionId: payload.id,
            amount,
            currency: payload.currency,
            customer: {
                id: payload.customer,
                email: payload.customer_email,
            },
            paymentIntent: payload.payment_intent,
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
        headers: req.headers['stripe-signature']
    });

    if (!req.body || !req.headers['stripe-signature']) {
        console.error('Missing webhook body or signature');
        return res.status(400).json({ 
            received: false,
            error: 'Missing webhook body or signature'
        });
    }

    try {
        const stripeEvent = stripeService.constructEvent(
            req.rawBody || req.body,
            req.headers['stripe-signature']
        );
        
        console.log(`Processing Stripe event: ${stripeEvent.type}`);
        
        switch (stripeEvent.type) {
            case 'checkout.session.completed':
                const result = await handleStripeCheckoutSessionCompleted(stripeEvent.data.object);
                console.log('Payment processed successfully:', result);
                break;

            default:
                console.log(`Unhandled webhook event type: ${stripeEvent.type}`);
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