/**
 * server/src/middleware/securityHeaders.js
 * 
 * Production Security Hardening & Headers Middleware for CodeNest.
 * Protects against Clickjacking, MIME Sniffing, XSS, and Open Redirect vulnerabilities.
 */

function securityHeaders(_req, res, next) {
  // Prevent clickjacking by forbidding embedding in iframes
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enforce HTTPS HSTS for 1 year
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Restrict referrer information passed in HTTP requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Enable XSS filter in legacy browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Restrict access to sensitive browser APIs
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
}

module.exports = { securityHeaders };
