/**
 * server/src/realtime/notify.js
 *
 * Real-time notification emitter.
 * Emits 1-to-1 to the recipient's private room: `user:${userId}`.
 *
 * SECURITY ASSERTION (Identity Rule 2):
 * For Shadow notifications (identity_context === 'shadow'), this helper
 * asserts that no real-identity keys exist in the payload.
 */

const { getIO } = require('./io');

const FORBIDDEN_REAL_IDENTITY_KEYS = [
  'name',
  'email',
  'avatar_url',
  'bio',
  'password_hash',
  'github_url',
  'twitter_url',
];

function emitNotification(userId, notification) {
  if (!userId || !notification) return;

  // Security Assertion for Shadow Notification Payload
  if (notification.identity_context === 'shadow') {
    for (const key of FORBIDDEN_REAL_IDENTITY_KEYS) {
      if (key in notification) {
        throw new Error(
          `SECURITY CRITICAL: Real identity key "${key}" detected in Shadow notification real-time payload!`
        );
      }
    }
  }

  const io = getIO();
  if (io) {
    // Emits 1-to-1 only to the target recipient's room
    io.to(`user:${userId}`).emit('notification:new', notification);
  }
}

module.exports = { emitNotification };
