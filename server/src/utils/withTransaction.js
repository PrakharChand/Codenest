/**
 * server/src/utils/withTransaction.js
 *
 * Runs a callback inside a single pg transaction.
 * Handles BEGIN / COMMIT / ROLLBACK and always releases the client.
 *
 * Convention (locked in CODENEST_REFERENCE.md):
 *   Counter + row mutations are ALWAYS transactional.
 *   Any action that both writes a row AND changes a counter
 *   (like, unlike, comment, share, join, leave) must use this helper
 *   so the row and its counter can never disagree.
 *
 * Usage:
 *   const result = await withTransaction(async (client) => {
 *     await client.query('INSERT INTO likes ...', [userId, postId]);
 *     await client.query('UPDATE posts SET like_count = like_count + 1 WHERE id = $1', [postId]);
 *     return { ok: true };
 *   });
 *
 * @param {Function} callback - async (client: PoolClient) => T
 * @returns {Promise<T>}
 */

const { getClient } = require('../config/db');

async function withTransaction(callback) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = withTransaction;
