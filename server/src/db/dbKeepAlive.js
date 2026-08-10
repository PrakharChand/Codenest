/**
 * server/src/db/dbKeepAlive.js
 * 
 * PostgreSQL Connection Pool Heartbeat & Keep-Alive Service for CodeNest.
 * Periodically issues lightweight SELECT 1 pings to prevent idle TCP connection drops
 * on Cloud PostgreSQL hosting providers (Supabase / Render).
 */

const { warmPool } = require('../config/db');

const HEARTBEAT_INTERVAL_MS = 20000; // 20 seconds

let keepAliveInterval = null;

function startDBKeepAlive() {
  if (keepAliveInterval) return;

  console.log('[dbKeepAlive] Database pool heartbeat keep-alive service started.');

  keepAliveInterval = setInterval(async () => {
    try {
      await warmPool(4);
    } catch (err) {
      console.warn('[dbKeepAlive] DB heartbeat ping warning:', err.message);
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Unref interval so node process can exit cleanly during shutdown
  if (keepAliveInterval.unref) {
    keepAliveInterval.unref();
  }
}

function stopDBKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    console.log('[dbKeepAlive] Database pool heartbeat stopped.');
  }
}

module.exports = { startDBKeepAlive, stopDBKeepAlive };
