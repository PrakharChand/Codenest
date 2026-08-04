/**
 * server/server.js
 *
 * Entry point — boots the HTTP + Socket.io server.
 * Imports env FIRST so missing vars cause an immediate clear error.
 */

const env  = require('./src/config/env');
const app  = require('./src/app');
const http = require('http');
const { initRealtime } = require('./src/realtime/io');
const { runMigrations } = require('./src/db/migrate');

const server = http.createServer(app);

// Initialize Socket.io with JWT handshake auth & per-user rooms
const io = initRealtime(server);
app.set('io', io);

// Boot server & execute automatic database migrations
async function boot() {
  if (env.NODE_ENV !== 'test') {
    try {
      await runMigrations({ exitOnFinish: false });
    } catch (err) {
      console.error('[boot] DB Migration notice:', err.message);
    }
  }

  server.listen(env.PORT, () => {
    console.log(`\n✅ CodeNest server running on port ${env.PORT} [${env.NODE_ENV}]`);
    console.log(`   Health: http://localhost:${env.PORT}/health\n`);
  });

  if (env.NODE_ENV !== 'test') {
    const { startAIReviewCron } = require('./src/jobs/aiReviewJob');
    startAIReviewCron();
  }
}

boot();
