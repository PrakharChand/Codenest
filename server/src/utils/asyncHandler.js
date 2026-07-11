/**
 * server/src/utils/asyncHandler.js
 *
 * Wraps an async Express controller so any rejected promise is forwarded
 * to the global error middleware via next(err), instead of causing an
 * UnhandledPromiseRejection crash.
 *
 * Convention: every async controller in the project is wrapped with this.
 * This IS the try/catch — controllers do not write their own.
 *
 * Usage:
 *   router.post('/register', asyncHandler(async (req, res) => { ... }));
 *
 * @param {Function} fn - async (req, res, next) => Promise<void>
 * @returns {Function}  - (req, res, next) => void
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
