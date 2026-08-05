/**
 * server/src/routes/assistantRoutes.js
 *
 * Routes for CodeNest Dual AI Assistants (CodeNest Guide & Shadow Mentor).
 * Protected by requireAuth middleware.
 */

const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const {
  getConversations,
  createConversation,
  renameConversation,
  deleteConversation,
  deleteOldestConversation,
  getMessages,
  sendMessage,
  getSettings,
  updateSettings,
} = require('../controllers/assistantController');

router.use(requireAuth);

// Conversations CRUD
router.get('/conversations', asyncHandler(getConversations));
router.post('/conversations', asyncHandler(createConversation));
router.delete('/conversations/oldest', asyncHandler(deleteOldestConversation));
router.patch('/conversations/:id', asyncHandler(renameConversation));
router.delete('/conversations/:id', asyncHandler(deleteConversation));

// Messaging
router.get('/conversations/:id/messages', asyncHandler(getMessages));
router.post('/conversations/:id/messages', asyncHandler(sendMessage));

// Settings
router.get('/settings', asyncHandler(getSettings));
router.put('/settings', asyncHandler(updateSettings));

module.exports = router;
