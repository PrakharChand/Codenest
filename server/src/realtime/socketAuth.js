/**
 * server/src/realtime/socketAuth.js
 *
 * Handshake authentication middleware for Socket.io.
 * Reuses the EXACT same verifyAccessToken utility as REST requireAuth.
 */

const { verifyAccessToken } = require('../utils/tokens');

function socketAuth(socket, next) {
  let token = socket.handshake.auth?.token;

  if (!token && socket.handshake.headers?.authorization) {
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return next(new Error('Authentication error: Missing access token.'));
  }

  try {
    const payload = verifyAccessToken(token);
    socket.userId = payload.sub;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid or expired access token.'));
  }
}

module.exports = socketAuth;
