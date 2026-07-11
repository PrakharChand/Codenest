/**
 * server/src/middleware/notFound.js
 *
 * Catch-all for routes that don't match any mounted handler.
 * Mount this AFTER all route definitions, BEFORE errorHandler.
 */

const ApiError = require('../utils/ApiError');

function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
