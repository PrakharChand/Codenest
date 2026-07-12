/**
 * server/src/routes/aiRoutes.js
 *
 * AI routes — all behind requireAuth + aiLimiter (20 req/hour/IP).
 * aiLimiter is expensive-API protection; it's applied here on every route.
 */

const express       = require('express');
const { body }      = require('express-validator');
const router        = express.Router();

const asyncHandler  = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');
const validate      = require('../middleware/validate');
const {
  suggestTagsRoute,
  anonymityCheckRoute,
  generateRoadmapRoute,
  suggestConnectionsRoute,
} = require('../controllers/aiController');

const suggestTagsValidation = [
  body('content').trim().notEmpty().withMessage('content is required.'),
];

const anonymityCheckValidation = [
  body('text').trim().notEmpty().withMessage('text is required.'),
];

const roadmapValidation = [
  body('level').trim().notEmpty().withMessage('level is required.'),
  body('knownTech').trim().notEmpty().withMessage('knownTech is required.'),
  body('goal').trim().notEmpty().withMessage('goal is required.'),
  body('hoursPerWeek').isNumeric().withMessage('hoursPerWeek must be a number.'),
];

router.post('/suggest-tags',         requireAuth, aiLimiter, suggestTagsValidation,   validate, asyncHandler(suggestTagsRoute));
router.post('/anonymity-check',      requireAuth, aiLimiter, anonymityCheckValidation, validate, asyncHandler(anonymityCheckRoute));
router.post('/generate-roadmap',     requireAuth, aiLimiter, roadmapValidation,        validate, asyncHandler(generateRoadmapRoute));
router.post('/suggest-connections',  requireAuth, aiLimiter,                                     asyncHandler(suggestConnectionsRoute));

module.exports = router;
