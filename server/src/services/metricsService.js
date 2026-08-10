/**
 * server/src/services/metricsService.js
 * 
 * Real-Time API Health & Performance Metrics Collector for CodeNest.
 * Collects HTTP traffic statistics, status code ratios, and route execution times
 * for engineering observability.
 */

class MetricsService {
  constructor() {
    this.startTime = Date.now();
    this.totalRequests = 0;
    this.statusCounts = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    this.routeHits = new Map();
  }

  recordRequest(method, route, statusCode) {
    this.totalRequests++;

    const statusGroup = `${Math.floor(statusCode / 100)}xx`;
    if (this.statusCounts[statusGroup] !== undefined) {
      this.statusCounts[statusGroup]++;
    }

    const key = `${method.toUpperCase()} ${route}`;
    const currentHits = this.routeHits.get(key) || 0;
    this.routeHits.set(key, currentHits + 1);
  }

  getMetrics() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const topRoutes = Array.from(this.routeHits.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([route, hits]) => ({ route, hits }));

    return {
      uptime_seconds: uptimeSeconds,
      total_requests: this.totalRequests,
      status_breakdown: this.statusCounts,
      top_popular_routes: topRoutes,
      timestamp: new Date().toISOString()
    };
  }
}

const metricsService = new MetricsService();
module.exports = metricsService;
