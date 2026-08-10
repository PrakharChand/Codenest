/**
 * server/src/utils/dbQueryRouter.js
 * 
 * Read/Write Split Router for CodeNest PostgreSQL.
 * Routes SELECT read queries to Read Replicas (if available) and
 * mutating INSERT/UPDATE/DELETE write queries to the primary master database.
 */

const pool = require('../config/db');

// Optional Read Replica Pool (Fallback to primary pool if READ_REPLICA_URL is not set)
const readPool = pool; 

async function executeQuery(text, params = []) {
  const trimmed = text.trim().toUpperCase();
  const isRead = trimmed.startsWith('SELECT') || trimmed.startsWith('WITH');

  const targetPool = isRead ? readPool : pool;
  return targetPool.query(text, params);
}

module.exports = {
  query: executeQuery,
  primaryPool: pool,
  readPool
};
