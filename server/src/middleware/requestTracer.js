/**
 * server/src/middleware/requestTracer.js
 * 
 * Distributed Request Tracing & Correlation ID Middleware for CodeNest.
 * Attaches a unique X-Request-ID UUID v4 to incoming requests and propagates it
 * through server logs and response headers for end-to-end distributed tracing.
 */

const crypto = require('crypto');

function requestTracer(req, res, next) {
  // Use client-provided request ID or generate a fresh UUID v4
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}

module.exports = { requestTracer };
