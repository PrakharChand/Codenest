/**
 * client/src/utils/offlineQueue.js
 * 
 * Client Offline Mutation Queue & Network Connectivity Detector for CodeNest.
 * Queues outgoing actions locally when offline and flushes pending requests
 * when internet connectivity is restored.
 */

const OFFLINE_QUEUE_KEY = 'cn_offline_queue';

export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function saveOfflineQueue(queue) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('[OfflineQueue] Failed to save offline queue:', err);
  }
}

export function enqueueOfflineAction(actionType, payload) {
  const queue = getOfflineQueue();
  queue.push({
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    actionType,
    payload,
    timestamp: new Date().toISOString()
  });
  saveOfflineQueue(queue);
  console.log(`[OfflineQueue] Enqueued offline action: ${actionType}`);
}

export async function flushOfflineQueue(executorFn) {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  console.log(`[OfflineQueue] Connection restored. Flushing ${queue.length} pending offline actions...`);
  const remaining = [];

  for (const item of queue) {
    try {
      await executorFn(item.actionType, item.payload);
      console.log(`[OfflineQueue] Successfully synced offline item ${item.id}`);
    } catch (err) {
      console.error(`[OfflineQueue] Failed to sync item ${item.id}, keeping in queue:`, err);
      remaining.push(item);
    }
  }

  saveOfflineQueue(remaining);
}

export function initOfflineQueueListener(executorFn) {
  window.addEventListener('online', () => {
    flushOfflineQueue(executorFn);
  });
}
