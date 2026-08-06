/**
 * server/src/routes/chatRoutes.js
 *
 * Real-time chat routes for Nest Feed (Mutual Connections).
 * All routes protected by requireAuth.
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const {
  getConversations,
  getOrCreateConversation,
  deleteConversation,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsRead,
  getUnreadCount,
} = require('../controllers/chatController');

router.use(requireAuth);

router.get('/conversations',              asyncHandler(getConversations));
router.post('/conversations',             asyncHandler(getOrCreateConversation));
router.delete('/conversations/:id',        asyncHandler(deleteConversation));

router.get('/conversations/:id/messages', asyncHandler(getMessages));
router.post('/conversations/:id/messages', asyncHandler(sendMessage));

router.put('/messages/:id',               asyncHandler(editMessage));
router.delete('/messages/:id',            asyncHandler(deleteMessage));

router.put('/conversations/:id/read',     asyncHandler(markAsRead));
router.get('/unread-count',               asyncHandler(getUnreadCount));

module.exports = router;
