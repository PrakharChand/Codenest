/**
 * server/src/routes/commentRoutes.js
 *
 * Comments are accessed via two route trees:
 *   /api/posts/:id/comments   — list + create (nested under post)
 *   /api/comments/:commentId  — delete (flat, for simplicity)
 *
 * Both routers are exported and mounted separately in app.js.
 */

const express       = require('express');
const { body }      = require('express-validator');

const asyncHandler  = require('../utils/asyncHandler');
const validate      = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { listComments, createComment, deleteComment } = require('../controllers/commentController');

// Router for /api/posts/:id/comments (mounted with mergeParams: true in app.js)
const nestedRouter = express.Router({ mergeParams: true });
nestedRouter.get('/',  asyncHandler(listComments));
nestedRouter.post('/',
  requireAuth,
  [body('content').trim().notEmpty().withMessage('Comment content is required.')
                  .isLength({ max: 5000 }).withMessage('Comment must be 5,000 characters or fewer.')],
  validate,
  asyncHandler(createComment)
);

// Router for /api/comments/:commentId
const flatRouter = express.Router();
flatRouter.delete('/:commentId', requireAuth, asyncHandler(deleteComment));

module.exports = { nestedRouter, flatRouter };
