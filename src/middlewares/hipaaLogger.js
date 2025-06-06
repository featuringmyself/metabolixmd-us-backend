const AuditLog = require('../models/auditLog.model');

/**
 * HIPAA Audit Log Middleware
 * Records all access to PHI data for compliance with HIPAA audit requirements
 */
const hipaaLogger = () => async (req, res, next) => {
  // Create a copy of the original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Get user information for audit log
  const userId = req.user ? req.user._id : 'unauthenticated';
  const userRole = req.user ? req.user.__t || 'User' : 'unauthenticated';
  
  // Create audit log entry
  const auditLog = {
    userId: userId,
    userRole: userRole,
    method: req.method,
    url: req.originalUrl,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    timestamp: new Date(),
    requestBody: sanitizeRequestBody(req.body),
    status: null,
    responseData: null,
    phiAccessed: isPHIEndpoint(req.originalUrl)
  };
  
  // Override response methods to capture response data
  res.send = function (body) {
    auditLog.status = res.statusCode;
    auditLog.responseData = typeof body === 'string' ? sanitizeResponseData(body) : sanitizeResponseData(JSON.stringify(body));
    
    // Save audit log asynchronously
    saveAuditLog(auditLog).catch(err => console.error('Error saving HIPAA audit log:', err));
    
    // Call the original method
    return originalSend.call(this, body);
  };
  
  res.json = function (body) {
    auditLog.status = res.statusCode;
    auditLog.responseData = sanitizeResponseData(JSON.stringify(body));
    
    // Save audit log asynchronously
    saveAuditLog(auditLog).catch(err => console.error('Error saving HIPAA audit log:', err));
    
    // Call the original method
    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Check if the endpoint potentially accesses PHI
 */
function isPHIEndpoint(url) {
  const phiEndpoints = [
    '/users',
    '/prescription',
    '/meeting',
    '/order'
  ];
  
  return phiEndpoints.some(endpoint => url.includes(endpoint));
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body) {
  if (!body) return null;
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  if (sanitized.password) sanitized.password = '[REDACTED]';
  if (sanitized.token) sanitized.token = '[REDACTED]';
  if (sanitized.creditCard) sanitized.creditCard = '[REDACTED]';
  
  return JSON.stringify(sanitized);
}

/**
 * Sanitize response data to remove sensitive information
 */
function sanitizeResponseData(data) {
  if (!data) return null;
  
  // Truncate large responses
  if (data.length > 1000) {
    return data.substring(0, 1000) + '... [truncated]';
  }
  
  return data;
}

/**
 * Save audit log to database
 */
async function saveAuditLog(auditLog) {
  try {
    await AuditLog.create(auditLog);
  } catch (error) {
    console.error('Error saving audit log:', error);
  }
}

module.exports = hipaaLogger;