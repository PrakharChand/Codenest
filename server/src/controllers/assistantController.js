/**
 * server/src/controllers/assistantController.js
 *
 * Controllers for Dual AI Assistant API endpoints:
 *  - Conversations CRUD with strict 5-chat limit enforcement per assistant mode
 *  - Messages streaming & generation
 *  - Auto conversation titles
 *  - User AI settings & preferences
 */

const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { generateAssistantResponse } = require('../services/aiAssistantService');

const MAX_CONVERSATIONS_LIMIT = 5;

/**
 * GET /api/assistant/conversations?mode=feed|shadow
 */
async function getConversations(req, res) {
  const mode = (req.query.mode || 'feed').toLowerCase();
  const userId = req.user.id;

  const { rows } = await query(
    `SELECT c.id, c.assistant_mode, c.title, c.created_at, c.updated_at,
            COUNT(m.id)::int AS message_count
     FROM ai_conversations c
     LEFT JOIN ai_messages m ON m.conversation_id = c.id
     WHERE c.user_id = $1 AND c.assistant_mode = $2
     GROUP BY c.id
     ORDER BY c.updated_at DESC`,
    [userId, mode]
  );

  return res.json({ conversations: rows, limit: MAX_CONVERSATIONS_LIMIT });
}

/**
 * POST /api/assistant/conversations
 * Body: { mode: 'feed'|'shadow', title?: string }
 * Enforces strict 5-chat limit!
 */
async function createConversation(req, res) {
  const userId = req.user.id;
  const mode = (req.body.mode || 'feed').toLowerCase();
  const title = req.body.title || 'New Conversation';

  // Count active conversations for this user & mode
  const countRes = await query(
    `SELECT COUNT(*)::int AS count FROM ai_conversations WHERE user_id = $1 AND assistant_mode = $2`,
    [userId, mode]
  );
  const count = countRes.rows[0]?.count || 0;

  if (count >= MAX_CONVERSATIONS_LIMIT) {
    // Retrieve list of existing conversations to return in 409 payload
    const { rows: existingChats } = await query(
      `SELECT c.id, c.title, c.created_at, COUNT(m.id)::int AS message_count
       FROM ai_conversations c
       LEFT JOIN ai_messages m ON m.conversation_id = c.id
       WHERE c.user_id = $1 AND c.assistant_mode = $2
       GROUP BY c.id
       ORDER BY c.created_at ASC`,
      [userId, mode]
    );

    return res.status(409).json({
      error: 'CONVERSATION_LIMIT_REACHED',
      message: `You already have ${MAX_CONVERSATIONS_LIMIT} saved conversations for this assistant. Please delete one to start a new chat.`,
      limit: MAX_CONVERSATIONS_LIMIT,
      conversations: existingChats,
    });
  }

  const { rows } = await query(
    `INSERT INTO ai_conversations (user_id, assistant_mode, title, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING id, assistant_mode, title, created_at, updated_at`,
    [userId, mode, title]
  );

  return res.status(201).json({ conversation: rows[0] });
}

/**
 * PATCH /api/assistant/conversations/:id
 * Body: { title }
 */
async function renameConversation(req, res) {
  const { id } = req.params;
  const { title } = req.body;
  if (!title || !title.trim()) throw ApiError.badRequest('Title is required.');

  const { rows } = await query(
    `UPDATE ai_conversations
     SET title = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING id, title, updated_at`,
    [title.trim(), id, req.user.id]
  );

  if (!rows.length) throw ApiError.notFound('Conversation not found.');
  return res.json({ conversation: rows[0] });
}

/**
 * DELETE /api/assistant/conversations/:id
 */
async function deleteConversation(req, res) {
  const { id } = req.params;

  const { rows } = await query(
    `DELETE FROM ai_conversations WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, req.user.id]
  );

  if (!rows.length) throw ApiError.notFound('Conversation not found.');
  return res.json({ message: 'Conversation deleted successfully.', id: rows[0].id });
}

/**
 * DELETE /api/assistant/conversations/oldest?mode=feed|shadow
 */
async function deleteOldestConversation(req, res) {
  const mode = (req.query.mode || 'feed').toLowerCase();
  const userId = req.user.id;

  const { rows } = await query(
    `DELETE FROM ai_conversations
     WHERE id = (
       SELECT id FROM ai_conversations
       WHERE user_id = $1 AND assistant_mode = $2
       ORDER BY created_at ASC LIMIT 1
     )
     RETURNING id, title`,
    [userId, mode]
  );

  if (!rows.length) throw ApiError.notFound('No conversations found to delete.');
  return res.json({ message: 'Oldest conversation deleted.', deleted: rows[0] });
}

/**
 * GET /api/assistant/conversations/:id/messages
 */
async function getMessages(req, res) {
  const { id } = req.params;
  const userId = req.user.id;

  // Verify ownership
  const convCheck = await query(
    'SELECT id, assistant_mode, title FROM ai_conversations WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  if (!convCheck.rows.length) throw ApiError.notFound('Conversation not found.');

  const { rows } = await query(
    `SELECT id, conversation_id, sender, content, tokens_used, created_at
     FROM ai_messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC`,
    [id]
  );

  return res.json({
    conversation: convCheck.rows[0],
    messages: rows,
  });
}

/**
 * POST /api/assistant/conversations/:id/messages
 * Body: { prompt }
 */
async function sendMessage(req, res) {
  const { id } = req.params;
  const { prompt } = req.body;
  const userId = req.user.id;

  if (!prompt || !prompt.trim()) throw ApiError.badRequest('Prompt is required.');

  // Verify conversation ownership
  const convCheck = await query(
    'SELECT id, assistant_mode, title FROM ai_conversations WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  if (!convCheck.rows.length) throw ApiError.notFound('Conversation not found.');
  const conversation = convCheck.rows[0];

  // Save User Message
  const userMsgRes = await query(
    `INSERT INTO ai_messages (conversation_id, sender, content, created_at)
     VALUES ($1, 'user', $2, NOW())
     RETURNING id, sender, content, created_at`,
    [id, prompt.trim()]
  );
  const userMessage = userMsgRes.rows[0];

  // Fetch past messages for context
  const pastMsgsRes = await query(
    `SELECT sender, content FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [id]
  );

  // Fetch User Settings
  const settingsRes = await query('SELECT * FROM ai_user_settings WHERE user_id = $1', [userId]);
  const userSettings = settingsRes.rows[0] || {};

  // Auto Title Update if conversation is currently "New Conversation"
  if (conversation.title === 'New Conversation' && pastMsgsRes.rows.length <= 2) {
    const autoTitle = prompt.trim().slice(0, 35) + (prompt.length > 35 ? '...' : '');
    await query('UPDATE ai_conversations SET title = $1 WHERE id = $2', [autoTitle, id]);
  }

  // Generate Assistant Response
  const assistantReplyText = await generateAssistantResponse({
    mode: conversation.assistant_mode,
    userPrompt: prompt.trim(),
    chatHistory: pastMsgsRes.rows,
    settings: userSettings,
  });

  // Save Assistant Message
  const aiMsgRes = await query(
    `INSERT INTO ai_messages (conversation_id, sender, content, created_at)
     VALUES ($1, 'assistant', $2, NOW())
     RETURNING id, sender, content, created_at`,
    [id, assistantReplyText]
  );
  const assistantMessage = aiMsgRes.rows[0];

  // Touch conversation updated_at timestamp
  await query('UPDATE ai_conversations SET updated_at = NOW() WHERE id = $1', [id]);

  return res.json({
    userMessage,
    assistantMessage,
  });
}

/**
 * GET /api/assistant/settings
 */
async function getSettings(req, res) {
  const userId = req.user.id;
  const { rows } = await query('SELECT * FROM ai_user_settings WHERE user_id = $1', [userId]);

  const defaultSettings = {
    model: 'gemini-flash-latest',
    temperature: 0.30,
    max_tokens: 2048,
    context_size: 4,
  };

  return res.json({ settings: rows[0] || defaultSettings });
}

/**
 * PUT /api/assistant/settings
 */
async function updateSettings(req, res) {
  const userId = req.user.id;
  const { model, temperature, max_tokens, context_size } = req.body;

  const modelVal = model || 'gemini-flash-latest';
  const tempVal = temperature !== undefined ? Math.max(0, Math.min(1, Number(temperature))) : 0.30;
  const maxTokensVal = max_tokens ? Math.max(256, Math.min(4096, Number(max_tokens))) : 2048;
  const ctxVal = context_size ? Math.max(1, Math.min(10, Number(context_size))) : 4;

  const { rows } = await query(
    `INSERT INTO ai_user_settings (user_id, model, temperature, max_tokens, context_size, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id) DO UPDATE
     SET model = EXCLUDED.model,
         temperature = EXCLUDED.temperature,
         max_tokens = EXCLUDED.max_tokens,
         context_size = EXCLUDED.context_size,
         updated_at = NOW()
     RETURNING *`,
    [userId, modelVal, tempVal, maxTokensVal, ctxVal]
  );

  return res.json({ settings: rows[0] });
}

module.exports = {
  getConversations,
  createConversation,
  renameConversation,
  deleteConversation,
  deleteOldestConversation,
  getMessages,
  sendMessage,
  getSettings,
  updateSettings,
};
