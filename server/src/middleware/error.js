// Error-handling middleware — must be registered last in app.js
// Normalizes all thrown errors to: { error: { code, message, field? } }
// This file documents the convention; the actual handler lives in app.js.
// Import AppError in controllers and throw it for consistent behavior.

// Validation error handler helper — converts express-validator result to AppError shape
const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * handleValidation
 * Use as middleware immediately after express-validator chains.
 * Returns 422 with the first validation error if any exist.
 */
function handleValidation(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return next(new AppError(first.msg, 422, 'VALIDATION_ERROR', first.path));
  }
  next();
}

module.exports = { handleValidation };
