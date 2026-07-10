/**
 * AppError — structured error for consistent JSON error shape.
 *
 * Convention: { error: { code, message, field? } }
 * Every controller catches errors and either re-throws an AppError
 * or wraps unknown errors before passing to next(err).
 */
class AppError extends Error {
  /**
   * @param {string} message  - Human-readable message
   * @param {number} status   - HTTP status code
   * @param {string} code     - Machine-readable error code (e.g. 'NOT_FOUND')
   * @param {string} [field]  - Optional field name for validation errors
   */
  constructor(message, status = 500, code = 'INTERNAL_ERROR', field) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    if (field) this.field = field;
  }
}

module.exports = AppError;
