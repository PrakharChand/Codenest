/**
 * server/src/routes/shadowRoutes.js
 *
 * ALL /api/shadow/ routes in one router.
 *
 * TASK 0 — Group Guard (Identity Rule 4):
 * This router is mounted in app.js behind BOTH requireAuth AND
 * requireAnonymousIdentity at the mount point, not per-route.
 * This makes it structurally impossible to add a Shadow route that
 * forgets the guard — the guard lives above all routes in this file.
 *
 * The middleware chain is:
 *   app.use('/api/shadow', requireAuth, requireAnonymousIdentity, shadowRoutes)
 *
 * That means every handler below is already authenticated AND has
 * a confirmed anonymous identity. No route in this file needs to
 * repeat requireAuth or requireAnonymousIdentity.
 */

const express       = require('express');
const { body }      = require('express-validator');
const router        = express.Router();

const asyncHandler  = require('../utils/asyncHandler');
const validate      = require('../middleware/validate');

const {
  createSubmission, getQueue, getMySubmissions, getSubmission,
} = require('../controllers/shadowSubmissionController');

const { createReview } = require('../controllers/shadowReviewController');
const { voteHelpful, getShadowProfile } = require('../controllers/shadowVoteController');
const { listShadowCommunityPosts, createShadowCommunityPost } = require('../controllers/shadowCommunityController');

// ── Validation chains ─────────────────────────────────────────────────────

const submissionValidation = [
  body('title').trim().notEmpty().withMessage('Title is required.')
               .isLength({ max: 200 }).withMessage('Title must be 200 characters or fewer.'),
  body('content').trim().notEmpty().withMessage('Content is required.')
                 .isLength({ max: 100000 }).withMessage('Content must be 100,000 characters or fewer.'),
  body('language_tag').trim().notEmpty().withMessage('Language tag is required.')
                      .isLength({ max: 50 }).withMessage('Language tag must be 50 characters or fewer.'),
  body('question').trim().notEmpty().withMessage('Question is required.')
                  .isLength({ max: 2000 }).withMessage('Question must be 2,000 characters or fewer.'),
];

const reviewValidation = [
  body('what_good').trim().notEmpty().withMessage('What went well is required.'),
  body('what_improve').trim().notEmpty().withMessage('What to improve is required.'),
  body('resources').optional(),
  body('helpfulness_rating')
    .isInt({ min: 1, max: 5 }).withMessage('Helpfulness rating must be between 1 and 5.'),
];

const communityPostValidation = [
  body('content').trim().notEmpty().withMessage('Content is required.')
                 .isLength({ max: 50000 }).withMessage('Content must be 50,000 characters or fewer.'),
];

// ── Submissions ───────────────────────────────────────────────────────────
router.post('/submissions',      submissionValidation, validate, asyncHandler(createSubmission));
router.get('/queue',                                             asyncHandler(getQueue));
router.get('/submissions/mine',                                  asyncHandler(getMySubmissions));
router.get('/submissions/:id',                                   asyncHandler(getSubmission));

// ── Reviews ───────────────────────────────────────────────────────────────
router.post('/submissions/:id/reviews', reviewValidation, validate, asyncHandler(createReview));

// ── Helpful voting ────────────────────────────────────────────────────────
router.post('/reviews/:id/helpful',                              asyncHandler(voteHelpful));

// ── Shadow profile ────────────────────────────────────────────────────────
router.get('/me',                                                asyncHandler(getShadowProfile));

// ── Anonymous community ───────────────────────────────────────────────────
router.get('/community',                                         asyncHandler(listShadowCommunityPosts));
router.post('/community',    communityPostValidation, validate,  asyncHandler(createShadowCommunityPost));

module.exports = router;
