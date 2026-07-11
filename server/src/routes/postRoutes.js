/**
 * server/src/routes/postRoutes.js
 *
 * URL definitions for /api/posts — no business logic here.
 * Convention: validation chains + middleware order; logic in controller.
 */

const express       = require('express');
const { body }      = require('express-validator');
const router        = express.Router();

const asyncHandler  = require('../utils/asyncHandler');
const validate      = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const {
  listPosts, getPost, createPost, updatePost, deletePost,
  likePost, unlikePost, sharePost,
} = require('../controllers/postController');

// Content limits — match CODENEST_REFERENCE.md
const postValidation = [
  body('title')
    .trim().notEmpty().withMessage('Title is required.')
    .isLength({ max: 200 }).withMessage('Title must be 200 characters or fewer.'),
  body('content')
    .trim().notEmpty().withMessage('Content is required.')
    .isLength({ max: 50000 }).withMessage('Content must be 50,000 characters or fewer.'),
  body('visibility')
    .optional()
    .isIn(['public', 'private', 'draft']).withMessage('Visibility must be public, private, or draft.'),
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array.')
    .custom((arr) => arr.every((t) => typeof t === 'string'))
    .withMessage('Each tag must be a string.'),
];

// Public
router.get('/',    asyncHandler(listPosts));
router.get('/:id', asyncHandler(getPost));         // auth optional — loaded from token in controller

// Protected — feed mutations
router.post('/',      requireAuth, postValidation, validate, asyncHandler(createPost));
router.put('/:id',    requireAuth,                            asyncHandler(updatePost));
router.delete('/:id', requireAuth,                            asyncHandler(deletePost));

// Like / unlike
router.post('/:id/like',   requireAuth, asyncHandler(likePost));
router.delete('/:id/like', requireAuth, asyncHandler(unlikePost));

// Share
router.post('/:id/share',  requireAuth, asyncHandler(sharePost));

module.exports = router;
