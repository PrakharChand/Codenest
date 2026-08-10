/**
 * server/src/utils/gracefulShutdown.js
 * 
 * Graceful Process Shutdown & Socket Draining Manager for CodeNest.
 * Intercepts SIGINT and SIGTERM signals during Render deployments or container restarts.
 * 
 * Execution Flow:
 *   1. Stop accepting new incoming HTTP connections.
 *   2. Close active Socket.io sessions.
 *   3. Drain and close PostgreSQL database connection pool.
 *   4. Exit process cleanly with exit code 0.
 */

const pool = require('../config/db');

function setupGracefulShutdown(server, io = null) {
  const shutdown = async (signal) => {
    console.log(`\n[GracefulShutdown] Signal ${signal} received. Commencing zero-downtime shutdown sequence...`);

    // 1. Close HTTP server (stop accepting new connections)
    server.close(() => {
      console.log('[GracefulShutdown] HTTP server closed. Inflight requests drained.');
    });

    // 2. Disconnect active Socket.io clients if present
    if (io) {
      console.log('[GracefulShutdown] Closing Socket.io real-time engine...');
      io.close(() => {
        console.log('[GracefulShutdown] Socket.io connections closed.');
      });
    }

    // 3. Drain PostgreSQL connection pool
    try {
      console.log('[GracefulShutdown] Closing PostgreSQL connection pool...');
      await pool.end();
      console.log('[GracefulShutdown] Database pool closed successfully.');
    } catch (err) {
      console.error('[GracefulShutdown] Error during DB pool shutdown:', err.message);
    }

    console.log('[GracefulShutdown] Cleanup complete. Exiting cleanly.\n');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = { setupGracefulShutdown };
