/**
 * server/src/utils/ApiError.js
 *
 * Structured error class for the whole application.
 * Every thrown error in a controller is an ApiError — never a raw Error.
 * The global errorHandler in middleware/errorHandler.js reads these fields
 * and formats them into the locked JSON shape: { error: { code, message, field? } }
 */

class ApiError extends Error {
  /**
   * @param {string}  message    - Human-readable message (shown to client)
   * @param {number}  statusCode - HTTP status code
   * @param {string}  code       - Machine-readable code (SCREAMING_SNAKE_CASE)
   * @param {string}  [field]    - Optional form field that caused the error
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', field) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    if (field !== undefined) this.field = field;
    // Captures proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  // ── Static factory helpers ──────────────────────────────────────────────

  /** 400 — malformed input (validation failures go here) */
  static badRequest(message, field) {
    return new ApiError(message, 400, 'BAD_REQUEST', field);
  }

  /** 401 — unauthenticated (no token / bad token / wrong password) */
  static unauthorized(message = 'Authentication required.') {
    return new ApiError(message, 401, 'UNAUTHORIZED');
  }

  /** 403 — authenticated but not permitted */
  static forbidden(message = 'You do not have permission to perform this action.') {
    return new ApiError(message, 403, 'FORBIDDEN');
  }

  /** 404 — resource not found */
  static notFound(message = 'Resource not found.') {
    return new ApiError(message, 404, 'NOT_FOUND');
  }

  /** 409 — conflict (e.g. duplicate email, identity already created) */
  static conflict(message, field) {
    return new ApiError(message, 409, 'CONFLICT', field);
  }

  /** 429 — too many requests (returned by rate limiter in the locked shape) */
  static tooManyRequests(message = 'Too many requests. Please try again later.') {
    return new ApiError(message, 429, 'RATE_LIMIT');
  }
}

module.exports = ApiError;
