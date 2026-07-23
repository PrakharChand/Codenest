/**
 * server/src/utils/createNotification.js
 *
 * Single helper that inserts a notifications row and emits real-time event.
 * Called from other controllers (not exposed as a route).
 *
 * IDENTITY RULE (Shadow notifications):
 *   A Shadow notification must NEVER contain real-identity text.
 *   Wrong: "Alice reviewed your code"
 *   Right: "Your submission received a new review"
 *   The message string is the caller's responsibility.
 *
 * Real-time emission:
 *   Calls emitNotification(userId, row) to push live 1-to-1 event to user's room.
 */

const { query } = require('../config/db');
const { emitNotification } = require('../realtime/notify');

async function createNotification({ userId, type, message, referenceId = null, identityContext, client }) {
  const runner = client || { query: (text, params) => query(text, params) };
  const { rows } = await runner.query(
    `INSERT INTO notifications (user_id, type, message, reference_id, identity_context)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, type, message, reference_id, is_read, identity_context, created_at`,
    [userId, type, message, referenceId, identityContext]
  );

  const notif = rows[0];

  // Emit real-time socket event (safe 1-to-1 emit)
  try {
    emitNotification(userId, notif);
  } catch (err) {
    // Fail-safe: realtime emit errors never break main DB operation
    console.error('[realtime] emit error:', err.message);
  }

  return notif;
}

module.exports = createNotification;
