import { io } from 'socket.io-client';

/**
 * client/src/realtime/socket.js
 *
 * Single managed Socket.io connection.
 * Connects only when authenticated with memory access token.
 */

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(accessToken) {
  if (!accessToken) return null;

  if (socket) {
    socket.auth = { token: accessToken };
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  // Derive backend WS URL from current location or default port 5000
  const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  socket = io(socketUrl, {
    auth: { token: accessToken },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect_error', (err) => {
    // Graceful degradation — socket auth/conn errors stay quiet, REST fallback handles UI
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
