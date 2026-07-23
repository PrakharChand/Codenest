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

  ioInstance = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  // Handshake authentication
  ioInstance.use(socketAuth);

  ioInstance.on('connection', (socket) => {
    const userRoom = `user:${socket.userId}`;
    socket.join(userRoom);

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
