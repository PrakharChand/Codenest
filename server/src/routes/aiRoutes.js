/**
 * server/src/routes/aiRoutes.js
 *
 * AI routes — all behind requireAuth + aiLimiter (20 req/hour/IP).
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
  body('knownTech')
    .custom((val, { req }) => {
      const tech = val || req.body.known_tech;
      if (typeof tech === 'string' && tech.trim().length > 0) return true;
      if (Array.isArray(tech) && tech.length > 0) return true;
      return false;
    })
    .withMessage('knownTech is required.'),
  body('goal').trim().notEmpty().withMessage('goal is required.'),
  body('hoursPerWeek')
    .custom((val, { req }) => {
      const hours = val || req.body.hours_per_week;
      const num = Number(hours);
      return !isNaN(num) && num > 0;
    })
    .withMessage('hoursPerWeek must be a number.'),
];

router.post('/suggest-tags',        requireAuth, aiLimiter, suggestTagsValidation,   validate, asyncHandler(suggestTagsRoute));
router.post('/anonymity-check',     requireAuth, aiLimiter, anonymityCheckValidation, validate, asyncHandler(anonymityCheckRoute));
router.post('/generate-roadmap',    requireAuth, aiLimiter, roadmapValidation,        validate, asyncHandler(generateRoadmapRoute));
router.post('/suggest-connections', requireAuth, aiLimiter,                                     asyncHandler(suggestConnectionsRoute));

module.exports = router;
