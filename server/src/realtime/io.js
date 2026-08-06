/**
 * server/src/realtime/io.js
 *
 * Socket.io server initialization and room management.
 *
 * ROOM NAMING DECISION (CODENEST_REFERENCE.md Realtime section):
 * Sockets join a server-internal private room: `user:${userId}`.
 * Room names are server-side only and never sent to clients.
 * Every notification is delivered 1-to-1 to its recipient's private room.
 */

const { Server } = require('socket.io');
const env = require('../config/env');
const socketAuth = require('./socketAuth');

let ioInstance = null;

function initRealtime(httpServer) {
  if (ioInstance) return ioInstance;

  const allowedOrigins = [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174'];

  ioInstance = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || (!env.IS_PRODUCTION && origin.startsWith('http://localhost:'))) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    },
  });

  // Handshake authentication
  ioInstance.use(socketAuth);

  ioInstance.on('connection', (socket) => {
    const userRoom = `user:${socket.userId}`;
    socket.join(userRoom);

    // STEP 3: Join private chat room user_USERID
    const chatUserRoom = `user_${socket.userId}`;
    socket.join(chatUserRoom);

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

module.exports = { initRealtime, getIO };
