/**
 * server/server.js
 *
 * Entry point — boots the HTTP + Socket.io server.
 * Imports env FIRST so missing vars cause an immediate clear error.
 *
 * Cron jobs are started here (not in app.js) so they:
 *   1. Never run during the test suite (NODE_ENV === 'test' guard)
 *   2. Only start once — app.js can be imported by tests many times
 */

const env  = require('./src/config/env');  // validates required vars before anything else
const app  = require('./src/app');
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin:      env.CLIENT_URL,
    credentials: true,
  },
});

// Attach io to app so controllers can emit events (used from Phase 5 onward)
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

server.listen(env.PORT, () => {
  console.log(`\n✅ CodeNest server running on port ${env.PORT} [${env.NODE_ENV}]`);
  console.log(`   Health: http://localhost:${env.PORT}/health\n`);
});

// ── Background jobs — guarded: never run during tests ─────────────────────
if (env.NODE_ENV !== 'test') {
  const { startAIReviewCron } = require('./src/jobs/aiReviewJob');
  startAIReviewCron();
}
