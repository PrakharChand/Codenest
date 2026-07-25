/**
 * server/src/config/db.js
 *
 * Single pg Pool for the entire application.
 * Convention: ALL database calls go through the query() helper below,
 * never through a scattered pool.connect() / client.query() pair.
 *
 * SSL is active only in production (Supabase requires it).
 * The pool connects lazily on the first query — never at import time.
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // Pool sizing — sensible defaults for Render free tier and Supabase session-mode
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Log pool errors without crashing — a lost connection is recoverable.
pool.on('error', (err, _client) => {
  console.error('[db] Unexpected idle client error:', err.message);
  // Do NOT call process.exit here. The pool will try to recover.
});

/**
 * query(text, params?)
 *
 * Thin wrapper so every module does `const { query } = require('../config/db')`
 * and never touches the pool directly. This is the single choke-point for:
 *  - Future query logging / tracing
 *  - Connection-level error wrapping
 *
 * @param {string}  text   - parameterized SQL string
 * @param {Array}   params - positional parameters ($1, $2, …)
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    if (process.env.NODE_ENV === 'development') {
      const duration = Date.now() - start;
      console.debug(`[db] query (${duration}ms): ${text.slice(0, 120)}`);
    }
    return result;
  } catch (err) {
    // Re-throw so controllers / migrate.js can handle it
    throw err;
  }
}

/**
 * getClient()
 *
 * For multi-statement transactions. Caller MUST release() the client
 * in a finally block.
 *
 * Usage:
 *   const client = await getClient();
 *   try {
 *     await client.query('BEGIN');
 *     ...
 *     await client.query('COMMIT');
 *   } catch (e) {
 *     await client.query('ROLLBACK');
 *     throw e;
 *   } finally {
 *     client.release();
 *   }
 */
async function getClient() {
  return pool.connect();
}

module.exports = { query, getClient, pool };
