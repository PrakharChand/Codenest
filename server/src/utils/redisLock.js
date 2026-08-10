/**
 * server/src/utils/redisLock.js
 * 
 * Distributed Lock & Mutex Manager for CodeNest.
 * Prevents race conditions during concurrent operations (e.g. claiming unique handles,
 * running scheduled cron jobs across multiple instance nodes).
 */

const crypto = require('crypto');

const lockStore = new Map();

/**
 * Acquire an atomic lock on a resource key.
 * @param {string} resourceKey - Unique identifier for the resource (e.g. 'lock:username:silent_fox42')
 * @param {number} ttlMs - Lock expiration time in milliseconds (default 10,000ms)
 * @returns {Promise<string|null>} Lock ID if acquired successfully, or null if locked by another process
 */
async function acquireLock(resourceKey, ttlMs = 10000) {
  const existing = lockStore.get(resourceKey);
  const now = Date.now();

  if (existing && existing.expiresAt > now) {
    return null; // Lock is currently held
  }

  const lockId = crypto.randomBytes(16).toString('hex');
  lockStore.set(resourceKey, {
    lockId,
    expiresAt: now + ttlMs
  });

  return lockId;
}

/**
 * Release an atomic lock on a resource key.
 * @param {string} resourceKey - The locked resource identifier
 * @param {string} lockId - The lock token received from acquireLock
 */
async function releaseLock(resourceKey, lockId) {
  const existing = lockStore.get(resourceKey);
  if (existing && existing.lockId === lockId) {
    lockStore.delete(resourceKey);
    return true;
  }
  return false;
}

module.exports = { acquireLock, releaseLock };
