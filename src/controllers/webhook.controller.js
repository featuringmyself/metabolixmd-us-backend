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
const crypto = require('crypto');
const { ApiError } = require('../utils/ApiError');
const logger = require('../config/logger');

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

/**
 * Validates the Square webhook signature
 * @param {string} signature - The x-square-hmacsha256-signature header
 * @param {string} url - The webhook URL
 * @param {Buffer} rawBody - The raw request body
 * @returns {boolean} Whether the signature is valid
 */
function validateWebhookSignature(signature, url, rawBody) {
  try {
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    if (!signatureKey) {
      logger.error('Missing webhook signature key');
      return false;
    }

    const hmac = crypto.createHmac('sha256', signatureKey);
    const data = url + rawBody;
    const calculatedSignature = hmac.update(data).digest('base64');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  } catch (error) {
    logger.error('Error validating webhook signature', { error: error.message });
    return false;
  }
}

/**
 * Processes a payment update event
 * @param {Object} payment - The payment object from Square
 * @param {string} eventId - The webhook event ID
 * @returns {Promise<void>}
 */
async function processPaymentUpdate(payment, eventId) {
  try {
    if (payment.status === 'COMPLETED') {
      await paymentService.verifyPayment(payment.id, eventId);
    } else {
      logger.info('Payment not completed', {
        paymentId: payment.id,
        status: payment.status
      });
    }
  } catch (error) {
    logger.error('Error processing payment update', {
      error: error.message,
      paymentId: payment.id,
      eventId
    });
    throw error;
  }
}

/**
 * Processes an order update event
 * @param {Object} order - The order object from Square
 * @param {string} eventId - The webhook event ID
 * @returns {Promise<void>}
 */
async function processOrderUpdate(order, eventId) {
  try {
    if (order.payments && order.payments.length > 0) {
      for (const payment of order.payments) {
        await processPaymentUpdate(payment, eventId);
      }
    } else {
      logger.info('Order has no payments', { orderId: order.id });
    }
  } catch (error) {
    logger.error('Error processing order update', {
      error: error.message,
      orderId: order.id,
      eventId
    });
    throw error;
  }
}

/**
 * Handles incoming Square webhooks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-square-hmacsha256-signature'];
    const url = req.originalUrl;
    const rawBody = req.rawBody;

    logger.info('Received webhook', {
      type: req.body.type,
      eventId: req.body.event_id,
      merchantId: req.body.merchant_id
    });

    // Validate webhook signature
    if (!validateWebhookSignature(signature, url, rawBody)) {
      logger.error('Invalid webhook signature', {
        signature,
        url,
        eventId: req.body.event_id
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { type, event_id, data } = req.body;

    // Handle different event types
    switch (type) {
      case 'payment.updated':
        if (data?.object?.payment) {
          await processPaymentUpdate(data.object.payment, event_id);
        } else {
          logger.warn('Invalid payment.updated payload structure', {
            eventId: event_id,
            data: JSON.stringify(data)
          });
        }
        break;

      case 'order.updated':
        if (data?.object?.order) {
          await processOrderUpdate(data.object.order, event_id);
        } else {
          logger.warn('Invalid order.updated payload structure', {
            eventId: event_id,
            data: JSON.stringify(data)
          });
        }
        break;

      default:
        logger.info('Unhandled webhook event type', { type, eventId: event_id });
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    // Still return 200 to prevent Square from retrying
    res.status(200).json({ error: 'Internal server error' });
  }
}

module.exports = {
  handleWebhook,
  validateWebhookSignature, // Exported for testing
  processPaymentUpdate,    // Exported for testing
  processOrderUpdate       // Exported for testing
};