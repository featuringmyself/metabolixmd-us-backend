const { Payment } = require('../models/payment.models');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');

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

module.exports = {
  create,
  getPaymentById,
  getPaymentsByOrderId,
  getPaymentsByUserId,
  getPayments,
};