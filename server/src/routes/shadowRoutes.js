/**
 * server/src/routes/shadowRoutes.js
 *
 * ALL /api/shadow/ routes in one router.
 * Mounted behind requireAuth AND requireAnonymousIdentity.
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');

const {
  createSubmission, getQueue, getQueueLanguages, getMySubmissions, getSubmission,
} = require('../controllers/shadowSubmissionController');

const { createReview, getMyReviews } = require('../controllers/shadowReviewController');
const { voteHelpful, getShadowProfile } = require('../controllers/shadowVoteController');
const {
  listShadowCommunities,
  createShadowCommunity,
  joinShadowCommunity,
  leaveShadowCommunity,
  listShadowCommunityPosts,
  createShadowCommunityPost,
} = require('../controllers/shadowCommunityController');

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

const shadowCommunityValidation = [
  body('name').trim().notEmpty().withMessage('Community name is required.')
              .isLength({ max: 100 }).withMessage('Name must be 100 characters or fewer.'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be 1,000 characters or fewer.'),
  body('type').optional().isIn(['public', 'private']).withMessage('Type must be public or private.'),
];

// ── Submissions ───────────────────────────────────────────────────────────
router.post('/submissions',      submissionValidation, validate, asyncHandler(createSubmission));
router.get('/queue/languages',                                         asyncHandler(getQueueLanguages));
router.get('/queue',                                                   asyncHandler(getQueue));
router.get('/submissions/mine',                                        asyncHandler(getMySubmissions));
router.get('/submissions/:id',                                         asyncHandler(getSubmission));

// ── Reviews ───────────────────────────────────────────────────────────────
router.post('/submissions/:id/reviews', reviewValidation, validate, asyncHandler(createReview));
router.get('/my-reviews',                                            asyncHandler(getMyReviews));

// ── Helpful voting ────────────────────────────────────────────────────────
router.post('/reviews/:id/helpful',                              asyncHandler(voteHelpful));

// ── Shadow profile ────────────────────────────────────────────────────────
router.get('/me',                                                asyncHandler(getShadowProfile));

// ── Anonymous community groups ─────────────────────────────────────────────
router.get('/communities',                                       asyncHandler(listShadowCommunities));
router.post('/communities', shadowCommunityValidation, validate, asyncHandler(createShadowCommunity));
router.post('/communities/:id/join',                             asyncHandler(joinShadowCommunity));
router.delete('/communities/:id/join',                           asyncHandler(leaveShadowCommunity));

// ── Anonymous community feed ──────────────────────────────────────────────
router.get('/community',                                         asyncHandler(listShadowCommunityPosts));
router.post('/community',    communityPostValidation, validate,  asyncHandler(createShadowCommunityPost));

module.exports = router;
