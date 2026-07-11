/**
 * server/src/middleware/rateLimit.js
 *
 * Configured express-rate-limit instances.
 * Centralising them here means:
 *   - Every limiter emits the same locked error shape
 *   - Later phases (e.g. Phase 5 AI limiter) add instances here, not ad-hoc
 *
 * All limiters use the locked JSON error shape:
 *   { error: { code: 'RATE_LIMIT', message: '...' } }
 */

const rateLimit = require('express-rate-limit');

/** Shared handler so every limiter returns the locked error shape */
const rateLimitHandler = (_req, res) => {
  res.status(429).json({
    error: {
      code:    'RATE_LIMIT',
      message: 'Too many requests. Please slow down and try again later.',
    },
  });
};

/**
 * authLimiter — strict limiter for login / register / refresh.
 * 10 attempts per 15-minute window per IP.
 * Prevents brute-force and credential-stuffing attacks.
 */
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  skipSuccessfulRequests: false,
});

/**
 * generalLimiter — default limiter for most API routes.
 * 200 requests per 15-minute window per IP.
 */
const generalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             200,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
});

/**
 * aiLimiter — reserved for Phase 5 AI routes.
 * Tight window because Claude API calls are expensive.
 * 20 requests per hour per IP.
 */
const aiLimiter = rateLimit({
  windowMs:        60 * 60 * 1000, // 1 hour
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
});

module.exports = { authLimiter, generalLimiter, aiLimiter };
