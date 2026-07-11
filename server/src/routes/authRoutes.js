/**
 * server/src/routes/authRoutes.js
 *
 * URL definitions for /api/auth/* — no business logic here.
 * Convention: routes = URL + middleware chain only. Logic is in the controller.
 */

const express      = require('express');
const { body }     = require('express-validator');
const router       = express.Router();

const asyncHandler  = require('../utils/asyncHandler');
const validate      = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const { requireAuth } = require('../middleware/auth');
const {
  register,
  login,
  refresh,
  logout,
  me,
  anonymousOptions,
  anonymousCreate,
} = require('../controllers/authController');

// ── Validation chains ─────────────────────────────────────────────────────

const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required.')
    .isLength({ max: 100 })
    .withMessage('Name must be 100 characters or fewer.'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.'),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

const anonymousCreateValidation = [
  body('adjective').trim().notEmpty().withMessage('Adjective is required.'),
  body('animal').trim().notEmpty().withMessage('Animal is required.'),
  body('number')
    .isInt({ min: 1, max: 99 })
    .withMessage('Number must be between 1 and 99.'),
];

// ── Routes ────────────────────────────────────────────────────────────────

// Public — rate-limited
router.post('/register', authLimiter, registerValidation,   validate, asyncHandler(register));
router.post('/login',    authLimiter, loginValidation,       validate, asyncHandler(login));
router.post('/refresh',  authLimiter,                                  asyncHandler(refresh));
router.post('/logout',                                                  asyncHandler(logout));

// Protected
router.get('/me', requireAuth, asyncHandler(me));

// Anonymous identity (protected)
router.get('/anonymous/options', requireAuth, asyncHandler(anonymousOptions));
router.post(
  '/anonymous/create',
  requireAuth,
  anonymousCreateValidation,
  validate,
  asyncHandler(anonymousCreate)
);

module.exports = router;
