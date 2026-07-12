/**
 * server/src/utils/createNotification.js
 *
 * Single helper that inserts a notifications row.
 * Called from other controllers (not exposed as a route).
 *
 * IDENTITY RULE (Shadow notifications):
 *   A Shadow notification must NEVER contain real-identity text.
 *   Wrong: "Alice reviewed your code"
 *   Right: "Your submission received a new review"
 *   The message string is the caller's responsibility.
 *
 * Implementation note: notifications are fire-and-forget inside
 * the caller's transaction. If called with a client (inside a
 * withTransaction callback), pass it so the notification is part
 * of the same atomic operation and is never created for a
 * rolled-back action.
 *
 * @param {object} opts
 * @param {number}  opts.userId          - recipient user_id
 * @param {string}  opts.type            - 'like'|'comment'|'share'|'connection'|'review'|'mention'
 * @param {string}  opts.message         - human-readable text (identity-free for shadow)
 * @param {number}  [opts.referenceId]   - related entity id (post, submission, etc.)
 * @param {'public'|'shadow'} opts.identityContext - which bell this appears in
 * @param {object}  [opts.client]        - pg PoolClient for use inside a transaction
 */

const { query } = require('../config/db');

async function createNotification({ userId, type, message, referenceId = null, identityContext, client }) {
  const runner = client || { query: (text, params) => query(text, params) };
  await runner.query(
    `INSERT INTO notifications (user_id, type, message, reference_id, identity_context)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, message, referenceId, identityContext]
  );
}

module.exports = createNotification;
