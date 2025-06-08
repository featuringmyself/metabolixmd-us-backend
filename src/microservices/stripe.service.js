// This file is kept for reference but is no longer used
// The application now uses Square instead of Stripe for payment processing
// See square.service.js for the current implementation

const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

// Placeholder functions that throw errors to prevent accidental usage
const constructEvent = () => {
  throw new ApiError(httpStatus.NOT_IMPLEMENTED, 'Stripe is no longer used. Please use Square instead.');
};

const createCheckoutSession = () => {
  throw new ApiError(httpStatus.NOT_IMPLEMENTED, 'Stripe is no longer used. Please use Square instead.');
};

const createCustomer = () => {
  throw new ApiError(httpStatus.NOT_IMPLEMENTED, 'Stripe is no longer used. Please use Square instead.');
};

const handleWebhookEvent = () => {
  throw new ApiError(httpStatus.NOT_IMPLEMENTED, 'Stripe is no longer used. Please use Square instead.');
};

module.exports = {
  createCustomer,
  createCheckoutSession,
  constructEvent,
  handleWebhookEvent
};