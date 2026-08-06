/**
 * server/src/controllers/chatController.js
 *
 * Real-time chat controller for mutual connections in Nest Feed.
 * SECURITY: Never return email or password_hash in any response.
 */

const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');
const { getIO } = require('../realtime/io');

// ── GET /api/chat/conversations ──────────────────────────────────────────
async function getConversations(req, res) {
  const userId = req.user.id;

  const { rows } = await query(
    `SELECT c.id, c.participant_one_id, c.participant_two_id, c.last_message_at, c.created_at,
            u.id AS other_user_id,
            u.name AS other_user_name,
            u.avatar_url AS other_user_avatar_url,
            m.content AS last_message_content,
            m.created_at AS last_message_created_at,
            m.sender_id AS last_message_sender_id,
            m.is_read AS last_message_is_read,
            (SELECT COUNT(*) FROM messages m2
             WHERE m2.conversation_id = c.id
               AND m2.sender_id <> $1
               AND m2.is_read = false) AS unread_count
     FROM conversations c
     JOIN users u ON u.id = (CASE WHEN c.participant_one_id = $1 THEN c.participant_two_id ELSE c.participant_one_id END)
     LEFT JOIN LATERAL (
       SELECT content, created_at, sender_id, is_read
       FROM messages
       WHERE conversation_id = c.id
       ORDER BY created_at DESC
       LIMIT 1
     ) m ON true
     WHERE c.participant_one_id = $1 OR c.participant_two_id = $1
     ORDER BY c.last_message_at DESC`,
    [userId]
  );

  return res.json({ conversations: rows });
}

// ── POST /api/chat/conversations ─────────────────────────────────────────
async function getOrCreateConversation(req, res) {
  const userId = req.user.id;
  const targetUserId = parseInt(req.body.targetUserId, 10);

  if (!targetUserId || isNaN(targetUserId)) {
    throw ApiError.badRequest('Target user ID is required.');
  }

  if (targetUserId === userId) {
    throw ApiError.badRequest('You cannot start a conversation with yourself.');
  }

  // 1. Verify mutual connection between userId and targetUserId
  const { rows: connRows } = await query(
    `SELECT COUNT(*) FROM connections
     WHERE (follower_id = $1 AND following_id = $2)
        OR (follower_id = $2 AND following_id = $1)`,
    [userId, targetUserId]
  );

  const connCount = parseInt(connRows[0].count, 10);
  if (connCount < 2) {
    return res.status(403).json({ message: 'You can only chat with mutual connections.' });
  }

  // 2. Determine smaller and larger ID to satisfy participant_one_id < participant_two_id
  const p1 = Math.min(userId, targetUserId);
  const p2 = Math.max(userId, targetUserId);

  // 3. Find or create conversation
  let { rows: convRows } = await query(
    `SELECT id, participant_one_id, participant_two_id, last_message_at, created_at
     FROM conversations
     WHERE participant_one_id = $1 AND participant_two_id = $2`,
    [p1, p2]
  );

  if (!convRows.length) {
    const { rows: newConv } = await query(
      `INSERT INTO conversations (participant_one_id, participant_two_id)
       VALUES ($1, $2)
       RETURNING id, participant_one_id, participant_two_id, last_message_at, created_at`,
      [p1, p2]
    );
    convRows = newConv;
  }

  const conv = convRows[0];

  // Fetch target user's public info (NO email or password_hash)
  const { rows: targetUserRows } = await query(
    `SELECT id AS other_user_id, name AS other_user_name, avatar_url AS other_user_avatar_url
     FROM users WHERE id = $1`,
    [targetUserId]
  );

  return res.json({
    ...conv,
    ...targetUserRows[0],
  });
}

// ── GET /api/chat/conversations/:id/messages ─────────────────────────────
async function getMessages(req, res) {
  const userId = req.user.id;
  const conversationId = parseInt(req.params.id, 10);

  // 1. Verify participant
  const { rows: convRows } = await query(
    `SELECT id, participant_one_id, participant_two_id FROM conversations WHERE id = $1`,
    [conversationId]
  );

  if (!convRows.length) {
    throw ApiError.notFound('Conversation not found.');
  }

  const conv = convRows[0];
  if (conv.participant_one_id !== userId && conv.participant_two_id !== userId) {
    return res.status(403).json({ message: 'You are not a participant in this conversation.' });
  }

  const { page, limit, offset } = parsePagination(req.query);

  const [countRes, messagesRes] = await Promise.all([
    query(`SELECT COUNT(*) FROM messages WHERE conversation_id = $1`, [conversationId]),
    query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.is_read, m.created_at,
              u.name AS sender_name, u.avatar_url AS sender_avatar_url
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    ),
  ]);

  const total = parseInt(countRes.rows[0].count, 10);
  return res.json(buildPaginatedResponse(messagesRes.rows, total, page, limit));
}

// ── POST /api/chat/conversations/:id/messages ────────────────────────────
async function sendMessage(req, res) {
  const userId = req.user.id;
  const conversationId = parseInt(req.params.id, 10);
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw ApiError.badRequest('Message content cannot be empty.');
  }

  if (content.trim().length > 2000) {
    throw ApiError.badRequest('Message content must not exceed 2000 characters.');
  }

  // 1. Verify participant
  const { rows: convRows } = await query(
    `SELECT id, participant_one_id, participant_two_id FROM conversations WHERE id = $1`,
    [conversationId]
  );

  if (!convRows.length) {
    throw ApiError.notFound('Conversation not found.');
  }

  const conv = convRows[0];
  if (conv.participant_one_id !== userId && conv.participant_two_id !== userId) {
    return res.status(403).json({ message: 'You are not a participant in this conversation.' });
  }

  // 2. Insert message & update last_message_at
  const { rows: msgRows } = await query(
    `INSERT INTO messages (conversation_id, sender_id, content)
     VALUES ($1, $2, $3)
     RETURNING id, conversation_id, sender_id, content, is_read, created_at`,
    [conversationId, userId, content.trim()]
  );

  await query(
    `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`,
    [conversationId]
  );

  // Fetch sender details
  const { rows: senderRows } = await query(
    `SELECT name AS sender_name, avatar_url AS sender_avatar_url FROM users WHERE id = $1`,
    [userId]
  );

  const fullMessage = {
    ...msgRows[0],
    sender_name: senderRows[0]?.sender_name || 'User',
    sender_avatar_url: senderRows[0]?.sender_avatar_url || null,
  };

  // 3. Socket.io real-time emit to recipient's private rooms
  const recipientId = conv.participant_one_id === userId ? conv.participant_two_id : conv.participant_one_id;
  try {
    const io = getIO();
    if (io) {
      io.to(`user_${recipientId}`).to(`user:${recipientId}`).emit('new_message', fullMessage);
    }
  } catch (err) {
    // Non-blocking socket error
  }

  return res.status(201).json(fullMessage);
}

// ── PUT /api/chat/conversations/:id/read ─────────────────────────
async function markAsRead(req, res) {
  const userId = req.user.id;
  const conversationId = parseInt(req.params.id, 10);

  // 1. Verify participant
  const { rows: convRows } = await query(
    `SELECT id, participant_one_id, participant_two_id FROM conversations WHERE id = $1`,
    [conversationId]
  );

  if (!convRows.length) {
    throw ApiError.notFound('Conversation not found.');
  }

  const conv = convRows[0];
  if (conv.participant_one_id !== userId && conv.participant_two_id !== userId) {
    return res.status(403).json({ message: 'You are not a participant in this conversation.' });
  }

  // 2. Mark messages as read
  await query(
    `UPDATE messages
     SET is_read = true
     WHERE conversation_id = $1 AND sender_id <> $2 AND is_read = false`,
    [conversationId, userId]
  );

  // 3. Emit messages_read event to other participant
  const recipientId = conv.participant_one_id === userId ? conv.participant_two_id : conv.participant_one_id;
  try {
    const io = getIO();
    if (io) {
      io.to(`user_${recipientId}`).to(`user:${recipientId}`).emit('messages_read', {
        conversation_id: conversationId,
        read_by: userId,
      });
    }
  } catch (err) {
    // Non-blocking socket error
  }

  return res.json({ message: 'Messages marked as read.', conversation_id: conversationId });
}

// ── GET /api/chat/unread-count ───────────────────────────────────────────
async function getUnreadCount(req, res) {
  const userId = req.user.id;

  const { rows } = await query(
    `SELECT COUNT(*) FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE (c.participant_one_id = $1 OR c.participant_two_id = $1)
       AND m.sender_id <> $1
       AND m.is_read = false`,
    [userId]
  );

  const unreadCount = parseInt(rows[0].count, 10);
  return res.json({ unreadCount });
}

module.exports = {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount,
};
