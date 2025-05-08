const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    checkoutSessionId: {
      type: String,
      required: [true, 'A payment must have a checkout session id'],
    },
    amount: {
      type: Number,
      required: [true, 'A payment must have an amount'],
    },
    currency: {
      type: String,
      required: [true, 'A revenue must have currency'],
      trim: true,
      maxLength: 3,
    },
    customer: {
      type: {
        id: String,
        email: String,
      },
      required: [true, 'A payment must have a customer'],
    },
    paymentIntent: {
      type: String,
      required: [true, 'A payment must have a payment intent'],
    },
    paymentStatus: {
      type: String, 
      required: [true, 'A payment must have a payment status'],
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = {
  Payment,
};
