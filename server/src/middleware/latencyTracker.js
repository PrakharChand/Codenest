/**
 * server/src/middleware/latencyTracker.js
 * 
 * Latency Tracking & APM Observability Middleware for CodeNest.
 * Appends X-Response-Time-ms headers to outgoing HTTP responses safely
 * and logs slow API routes exceeding 500ms latency threshold.
 */

const metricsService = require('../services/metricsService');

function latencyTracker(req, res, next) {
  const startTime = Date.now();

  // Safely hook writeHead to set header BEFORE headers stream to client
  const originalWriteHead = res.writeHead;
  res.writeHead = function (...args) {
    if (!res.headersSent) {
      const durationMs = Date.now() - startTime;
      res.setHeader('X-Response-Time-ms', durationMs);
    }
    return originalWriteHead.apply(res, args);
  };

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const route = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;

    metricsService.recordRequest(req.method, route, res.statusCode);

    // APM Slow Request Warning Alert (> 500ms, excluding health ping route)
    if (durationMs > 500 && route !== '/health') {
      console.warn(
        JSON.stringify({
          level: 'WARN',
          type: 'SLOW_REQUEST_APM',
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          duration_ms: durationMs,
          timestamp: new Date().toISOString()
        })
      );
    }
  });

  next();
}

module.exports = { latencyTracker };
