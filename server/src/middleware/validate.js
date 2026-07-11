/**
 * server/src/middleware/validate.js
 *
 * Runs express-validator's validationResult on the request.
 * On failure, throws ApiError.badRequest with the first failing field's
 * message and the field name in `field` — so the frontend can attach the
 * error to the right input without scanning the whole error object.
 *
 * Convention: validation rule chains live beside each route definition,
 * not here. This middleware is the final step in every route's validation chain.
 *
 * Usage in a route:
 *   router.post('/register',
 *     [body('email').isEmail().normalizeEmail(), ...],
 *     validate,
 *     asyncHandler(registerController)
 *   );
 */

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array({ onlyFirstError: true })[0];
    // `path` is the field name in express-validator v7
    return next(ApiError.badRequest(first.msg, first.path));
  }
  next();
}

module.exports = validate;
