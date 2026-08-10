/**
 * server/src/services/sseService.js
 * 
 * Server-Sent Events (SSE) Live Streaming Service for CodeNest.
 * Provides HTTP streaming fallbacks for real-time notification alerts
 * when WebSockets are blocked by corporate proxies or firewalls.
 */

class SSEService {
  constructor() {
    this.clients = new Map(); // userId -> Set of res stream objects
  }

  registerClient(userId, res) {
    // Set mandatory SSE HTTP streaming headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable proxy buffering for Nginx/Vercel
    });

    res.write('retry: 10000\n\n'); // Reconnect interval 10s
    res.write(`data: ${JSON.stringify({ event: 'connected', message: 'SSE Stream Connected' })}\n\n`);

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(res);

    console.log(`[SSE] User ${userId} registered active SSE stream. Total clients: ${this.clients.get(userId).size}`);

    // Handle stream disconnection
    res.on('close', () => {
      const userStreams = this.clients.get(userId);
      if (userStreams) {
        userStreams.delete(res);
        if (userStreams.size === 0) {
          this.clients.delete(userId);
        }
      }
      console.log(`[SSE] User ${userId} closed SSE stream.`);
    });
  }

  sendNotificationToUser(userId, notificationData) {
    const userStreams = this.clients.get(userId);
    if (!userStreams || userStreams.size === 0) return false;

    const payload = `data: ${JSON.stringify(notificationData)}\n\n`;
    userStreams.forEach((res) => {
      res.write(payload);
    });

    console.log(`[SSE] Streamed live event to ${userStreams.size} connection(s) for user ${userId}`);
    return true;
  }
}

const sseService = new SSEService();
module.exports = sseService;
