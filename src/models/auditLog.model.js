const mongoose = require('mongoose');
const { paginate } = require('./plugins/paginate');

/**
 * HIPAA Audit Log Schema
 * Records all access to PHI data for compliance with HIPAA audit requirements
 */
const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    userRole: {
      type: String,
      required: true
    },
    method: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true
    },
    requestBody: {
      type: String
    },
    status: {
      type: Number
    },
    responseData: {
      type: String
    },
    phiAccessed: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Add TTL index for data retention policy (default 7 years)
const retentionDays = process.env.DATA_RETENTION_DAYS || 2555; // 7 years
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: retentionDays * 86400 });

auditLogSchema.plugin(paginate);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;