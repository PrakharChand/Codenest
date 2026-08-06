/**
 * server/src/routes/communityRoutes.js
 *
 * URL definitions for /api/communities routes.
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { requireCommunityRole } = require('../middleware/communityAuth');

const {
  listCommunities,
  getCommunity,
  getPostsByCommunity,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  joinCommunity,
  leaveCommunity,
  createCommunityPost,
} = require('../controllers/communityController');

const {
  listTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic,
  getPostsByTopic,
} = require('../controllers/communityTopicController');

const {
  listMembers,
  removeMember,
  updateMemberRole,
} = require('../controllers/communityMemberController');

const {
  listRequests,
  approveRequest,
  rejectRequest,
} = require('../controllers/communityJoinRequestController');

// ── Validation ─────────────────────────────────────────────────────────────
const communityValidation = [
  body('name').trim().notEmpty().withMessage('Community name is required.')
              .isLength({ max: 100 }).withMessage('Name must be 100 characters or fewer.'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be 1,000 characters or fewer.'),
  body('type').optional().isIn(['public', 'private']).withMessage('Type must be public or private.'),
];

const communityPostValidation = [
  body('title').trim().notEmpty().withMessage('Title is required.')
               .isLength({ max: 200 }).withMessage('Title must be 200 characters or fewer.'),
  body('content').trim().notEmpty().withMessage('Content is required.')
                 .isLength({ max: 50000 }).withMessage('Content must be 50,000 characters or fewer.'),
  body('topic_id').optional({ nullable: true }).isInt().withMessage('topic_id must be an integer.'),
];

const topicValidation = [
  body('name').trim().notEmpty().withMessage('Topic name is required.')
              .isLength({ max: 100 }).withMessage('Topic name must be 100 characters or fewer.'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be 500 characters or fewer.'),
];

// ── Public / Discovery Routes ──────────────────────────────────────────────
router.get('/',                            optionalAuth, asyncHandler(listCommunities));
router.get('/:id',                         optionalAuth, asyncHandler(getCommunity));
router.get('/:id/posts',                   optionalAuth, asyncHandler(getPostsByCommunity));

// ── Community Topics Routes ────────────────────────────────────────────────
router.get('/:id/topics',                  optionalAuth, asyncHandler(listTopics));
router.get('/:id/topics/:topicId',         optionalAuth, asyncHandler(getTopic));
router.get('/:id/topics/:topicId/posts',   optionalAuth, asyncHandler(getPostsByTopic));

router.post('/:id/topics',                 requireAuth, requireCommunityRole('admin'), topicValidation, validate, asyncHandler(createTopic));
router.put('/:id/topics/:topicId',         requireAuth, requireCommunityRole('admin'), asyncHandler(updateTopic));
router.delete('/:id/topics/:topicId',      requireAuth, requireCommunityRole('admin'), asyncHandler(deleteTopic));

// ── Member Management Routes ───────────────────────────────────────────────
router.get('/:id/members',                 optionalAuth, asyncHandler(listMembers));
router.delete('/:id/members/:userId',       requireAuth, requireCommunityRole('admin'), asyncHandler(removeMember));
router.put('/:id/members/:userId/role',    requireAuth, requireCommunityRole('owner'), asyncHandler(updateMemberRole));

// ── Join Requests (Private Communities) ───────────────────────────────────
router.get('/:id/requests',                requireAuth, requireCommunityRole('admin'), asyncHandler(listRequests));
router.post('/:id/requests/:requestId/approve', requireAuth, requireCommunityRole('admin'), asyncHandler(approveRequest));
router.post('/:id/requests/:requestId/reject',  requireAuth, requireCommunityRole('admin'), asyncHandler(rejectRequest));

// ── Protected Community Actions ───────────────────────────────────────────
router.post('/',                           requireAuth, communityValidation, validate, asyncHandler(createCommunity));
router.put('/:id',                         requireAuth, requireCommunityRole('admin'), communityValidation, validate, asyncHandler(updateCommunity));
router.delete('/:id',                      requireAuth, requireCommunityRole('owner'), asyncHandler(deleteCommunity));

router.post('/:id/join',                   requireAuth, asyncHandler(joinCommunity));
router.delete('/:id/join',                 requireAuth, asyncHandler(leaveCommunity));
router.post('/:id/posts',                  requireAuth, communityPostValidation, validate, asyncHandler(createCommunityPost));

module.exports = router;
