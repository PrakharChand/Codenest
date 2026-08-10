/**
 * server/src/middleware/latencyTracker.js
 * 
 * Latency Tracking & APM Observability Middleware for CodeNest.
 * Appends X-Response-Time-ms headers to outgoing HTTP responses and
 * logs slow API routes exceeding 500ms latency threshold.
 */

function latencyTracker(req, res, next) {
  const startHrTime = process.hrtime();

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = Math.round(elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6);

    res.setHeader('X-Response-Time-ms', elapsedTimeInMs);

    // APM Slow Request Warning Alert (> 500ms)
    if (elapsedTimeInMs > 500) {
      console.warn(
        JSON.stringify({
          level: 'WARN',
          type: 'SLOW_REQUEST_APM',
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          duration_ms: elapsedTimeInMs,
          timestamp: new Date().toISOString()
        })
      );
    }
  });

  next();
}

module.exports = { latencyTracker };
