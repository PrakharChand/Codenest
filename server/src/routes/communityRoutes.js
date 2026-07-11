/**
 * server/src/routes/communityRoutes.js
 *
 * URL definitions for /api/communities routes.
 */

const express        = require('express');
const { body }       = require('express-validator');
const router         = express.Router();

const asyncHandler   = require('../utils/asyncHandler');
const validate       = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const {
  listCommunities, getCommunity, createCommunity,
  joinCommunity, leaveCommunity, createCommunityPost,
} = require('../controllers/communityController');

const communityValidation = [
  body('name').trim().notEmpty().withMessage('Community name is required.')
              .isLength({ max: 100 }).withMessage('Name must be 100 characters or fewer.'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be 1,000 characters or fewer.'),
];

const communityPostValidation = [
  body('title').trim().notEmpty().withMessage('Title is required.')
               .isLength({ max: 200 }).withMessage('Title must be 200 characters or fewer.'),
  body('content').trim().notEmpty().withMessage('Content is required.')
                 .isLength({ max: 50000 }).withMessage('Content must be 50,000 characters or fewer.'),
];

// Public
router.get('/',    asyncHandler(listCommunities));
router.get('/:id', asyncHandler(getCommunity));

// Protected
router.post('/',               requireAuth, communityValidation,     validate, asyncHandler(createCommunity));
router.post('/:id/join',       requireAuth,                                    asyncHandler(joinCommunity));
router.delete('/:id/join',     requireAuth,                                    asyncHandler(leaveCommunity));
router.post('/:id/posts',      requireAuth, communityPostValidation, validate, asyncHandler(createCommunityPost));

module.exports = router;
