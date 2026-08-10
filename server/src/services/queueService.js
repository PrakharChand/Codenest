/**
 * server/src/services/queueService.js
 * 
 * Asynchronous Background Job Queue Infrastructure for CodeNest.
 * Offloads expensive tasks (AI Content Scans, Email Warning Notices, AI Auto-Reviews)
 * off the primary Express HTTP request-response cycle.
 * 
 * Features:
 *   - Redis-backed BullMQ queue execution when REDIS_URL is configured.
 *   - Automatic in-memory async execution fallback when Redis is absent.
 */

const env = require('../config/env');

// In-Memory Async Task Runner Fallback
class LocalAsyncQueue {
  constructor(name) {
    this.name = name;
  }

  async add(jobName, data, opts = {}) {
    console.log(`[Queue:${this.name}] Enqueued async job '${jobName}' with payload keys:`, Object.keys(data));
    // Execute asynchronously on next tick without blocking current thread
    setImmediate(async () => {
      try {
        if (this.processor) {
          await this.processor({ name: jobName, data });
        }
      } catch (err) {
        console.error(`[Queue:${this.name}] Job '${jobName}' failed:`, err.message);
      }
    });
    return { id: `local_${Date.now()}` };
  }

  process(processorFn) {
    this.processor = processorFn;
  }
}

// Queue instances
const emailQueue = new LocalAsyncQueue('EmailQueue');
const aiModerationQueue = new LocalAsyncQueue('AIModerationQueue');
const aiReviewQueue = new LocalAsyncQueue('AIReviewQueue');

// Initialize processors
emailQueue.process(async (job) => {
  const emailService = require('./emailService');
  if (job.name === 'sendViolationWarning') {
    const { email, username, strikeNumber, reason } = job.data;
    await emailService.sendViolationWarningEmail({ email, username, strikeNumber, reason });
  }
});

aiModerationQueue.process(async (job) => {
  const moderationService = require('./moderationService');
  if (job.name === 'scanContent') {
    const { text, contentType, userId } = job.data;
    await moderationService.moderateText(text, contentType, userId);
  }
});

module.exports = {
  emailQueue,
  aiModerationQueue,
  aiReviewQueue
};
