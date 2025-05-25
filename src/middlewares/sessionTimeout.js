const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

/**
 * Session Timeout Middleware for HIPAA Compliance
 * Enforces automatic session termination after a period of inactivity
 */
const sessionTimeout = (timeoutMs = 900000) => { // Default 15 minutes (900000ms)
  const sessions = new Map();
  
  return (req, res, next) => {
    const token = req.headers?.authorization?.split(' ')[1];
    
    if (!token) {
      return next();
    }
    
    const currentTime = Date.now();
    const sessionData = sessions.get(token);
    
    // Check if session exists and has timed out
    if (sessionData && (currentTime - sessionData.lastActivity > timeoutMs)) {
      sessions.delete(token);
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Session expired due to inactivity'));
    }
    
    // Update or create session activity timestamp
    sessions.set(token, { 
      lastActivity: currentTime,
      userId: req.user?._id
    });
    
    // Clean up old sessions periodically (every 100 requests)
    if (Math.random() < 0.01) {
      cleanupSessions(sessions, timeoutMs, currentTime);
    }
    
    next();
  };
};

/**
 * Clean up expired sessions
 */
function cleanupSessions(sessions, timeoutMs, currentTime) {
  for (const [token, sessionData] of sessions.entries()) {
    if (currentTime - sessionData.lastActivity > timeoutMs) {
      sessions.delete(token);
    }
  }
}

module.exports = sessionTimeout;