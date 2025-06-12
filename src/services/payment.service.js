const { Payment } = require('../models/payment.models');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');
const squareClient = require('../config/square.config');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

async function create(paymentData) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    
    console.log('Creating payment record:', {
      orderId: paymentData.order,
      userId: paymentData.user,
      sessionId: paymentData.checkoutSessionId
    });

    // Validate required fields
    if (!paymentData.user || !paymentData.order || !paymentData.checkoutSessionId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Missing required payment fields');
    }

    const payment = await Payment.create([paymentData], { session });
    if (!payment || !payment[0]) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create payment record');
    }

    // Populate user and order details
    const populatedPayment = await payment[0].populate(['user', 'order']);
    
    await session.commitTransaction();
    console.log('Payment record created successfully:', {
      paymentId: populatedPayment._id,
      orderId: populatedPayment.order._id,
      status: populatedPayment.paymentStatus
    });
    
    return populatedPayment;
  } catch (error) {
    await session.abortTransaction();
    console.error('Payment creation error:', {
      error: error.message,
      orderId: paymentData.order,
      userId: paymentData.user
    });
    throw error;
  } finally {
    session.endSession();
  }
}

async function getPaymentById(id) {
  console.log('Fetching payment by ID:', id);
  const payment = await Payment.findById(id).populate(['user', 'order']);
  if (!payment) {
    console.log('Payment not found:', id);
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');
  }
  return payment;
}

async function getPaymentsByOrderId(orderId) {
  console.log('Fetching payments for order:', orderId);
  const payments = await Payment.find({ order: orderId })
    .populate(['user', 'order'])
    .sort({ createdAt: -1 });
  console.log(`Found ${payments.length} payments for order:`, orderId);
  return payments;
}

async function getPaymentsByUserId(userId) {
  console.log('Fetching payments for user:', userId);
  const payments = await Payment.find({ user: userId })
    .populate(['user', 'order'])
    .sort({ createdAt: -1 });
  console.log(`Found ${payments.length} payments for user:`, userId);
  return payments;
}

async function getPayments(filters = {}, options = {}) {
  console.log('Fetching payments with filters:', filters);
  options.populate = ['user', 'order'];
  options.sort = options.sort || { createdAt: -1 };
  const result = await Payment.paginate(filters, options);
  console.log(`Found ${result.totalDocs} payments`);
  return result;
}

/**
 * Creates a payment using Square's API
 * @param {string} sourceId - The source ID (e.g., 'cnon:card-nonce-ok' for sandbox)
 * @param {number} amount - Amount in cents
 * @param {string} orderId - Associated order ID
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {Promise<Object>} The payment object
 */
async function createPayment(sourceId, amount, orderId, currency = 'USD') {
  try {
    const payment = await squareClient.paymentsApi.createPayment({
      idempotencyKey: uuidv4(),
      sourceId,
      amountMoney: {
        amount,
        currency
      },
      locationId: process.env.SQUARE_LOCATION_ID,
      note: `Order ID: ${orderId}`
    });

    const paymentData = payment.result.payment;
    
    // Store payment in database
    await Payment.create({
      squarePaymentId: paymentData.id,
      orderId,
      amount: paymentData.amountMoney.amount,
      currency: paymentData.amountMoney.currency,
      status: paymentData.status,
      metadata: {
        receiptNumber: paymentData.receiptNumber,
        sourceType: paymentData.sourceType,
        cardDetails: paymentData.cardDetails
      }
    });

    logger.info('Payment created', {
      paymentId: paymentData.id,
      orderId,
      amount,
      status: paymentData.status
    });

    return paymentData;
  } catch (error) {
    logger.error('Error creating payment', {
      error: error.message,
      sourceId,
      amount,
      orderId
    });
    throw new ApiError(500, 'Failed to create payment');
  }
}

/**
 * Gets the status of a payment using Square's API
 * @param {string} paymentId - The Square payment ID
 * @returns {Promise<Object>} The payment object with status
 */
async function getPaymentStatus(paymentId) {
  try {
    const response = await squareClient.paymentsApi.getPayment(paymentId);
    return response.result.payment;
  } catch (error) {
    logger.error('Error getting payment status', {
      error: error.message,
      paymentId
    });
    throw new ApiError(500, 'Failed to get payment status');
  }
}

/**
 * Verifies and updates payment status
 * @param {string} paymentId - The Square payment ID
 * @param {string} eventId - The webhook event ID
 * @returns {Promise<Object>} The updated payment object
 */
async function verifyPayment(paymentId, eventId) {
  try {
    logger.info('Verifying payment', {
      paymentId,
      eventId
    });

    // Check for duplicate webhook event
    const existingPayment = await Payment.findOne({ webhookEventId: eventId });
    if (existingPayment) {
      logger.info('Duplicate webhook event received', { 
        eventId, 
        paymentId,
        existingPaymentId: existingPayment._id
      });
      return existingPayment;
    }

    // Get latest payment status from Square
    const squarePayment = await getPaymentStatus(paymentId);
    
    logger.info('Retrieved payment status from Square', {
      paymentId,
      status: squarePayment.status,
      orderId: squarePayment.orderId,
      amount: squarePayment.amountMoney?.amount,
      currency: squarePayment.amountMoney?.currency
    });

    // Update payment in database
    const payment = await Payment.findOneAndUpdate(
      { squarePaymentId: paymentId },
      {
        status: squarePayment.status,
        verifiedAt: new Date(),
        verificationMethod: 'WEBHOOK',
        webhookEventId: eventId,
        metadata: {
          receiptNumber: squarePayment.receiptNumber,
          sourceType: squarePayment.sourceType,
          cardDetails: squarePayment.cardDetails,
          riskEvaluation: squarePayment.riskEvaluation,
          receiptUrl: squarePayment.receiptUrl
        },
        $setOnInsert: {
          orderId: squarePayment.orderId,
          amount: squarePayment.amountMoney?.amount,
          currency: squarePayment.amountMoney?.currency
        }
      },
      { upsert: true, new: true }
    );

    logger.info('Payment verified and updated', {
      paymentId,
      eventId,
      status: payment.status,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency
    });

    return payment;
  } catch (error) {
    logger.error('Error verifying payment', {
      error: error.message,
      stack: error.stack,
      paymentId,
      eventId
    });
    throw new ApiError(500, 'Failed to verify payment');
  }
}

module.exports = {
  create,
  getPaymentById,
  getPaymentsByOrderId,
  getPaymentsByUserId,
  getPayments,
  createPayment,
  getPaymentStatus,
  verifyPayment
};