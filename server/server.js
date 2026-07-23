/**
 * server/server.js
 *
 * Entry point — boots the HTTP + Socket.io server.
 * Imports env FIRST so missing vars cause an immediate clear error.
 *
 * Cron jobs and socket server initialization are done here so they:
 *   1. Never run during the test suite (NODE_ENV === 'test' guard)
 *   2. Only start once — app.js can be imported by tests many times
 */

const env  = require('./src/config/env');  // validates required vars before anything else
const app  = require('./src/app');
const http = require('http');
const { initRealtime } = require('./src/realtime/io');

const server = http.createServer(app);

// Initialize Socket.io with JWT handshake auth & per-user rooms
const io = initRealtime(server);
app.set('io', io);

server.listen(env.PORT, () => {
  console.log(`\n✅ CodeNest server running on port ${env.PORT} [${env.NODE_ENV}]`);
  console.log(`   Health: http://localhost:${env.PORT}/health\n`);
});

// ── Background jobs — guarded: never run during tests ─────────────────────
if (env.NODE_ENV !== 'test') {
  const { startAIReviewCron } = require('./src/jobs/aiReviewJob');
  startAIReviewCron();
}
