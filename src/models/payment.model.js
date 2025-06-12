const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  squarePaymentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderId: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'PENDING'
  },
  verifiedAt: {
    type: Date
  },
  verificationMethod: {
    type: String,
    enum: ['WEBHOOK', 'API', 'MANUAL'],
    default: 'WEBHOOK'
  },
  webhookEventId: {
    type: String,
    unique: true,
    sparse: true
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for idempotency
paymentSchema.index({ webhookEventId: 1 }, { unique: true, sparse: true });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment; 