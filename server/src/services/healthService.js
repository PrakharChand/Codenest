/**
 * server/src/services/healthService.js
 * 
 * Deep Health Check & Dependency Diagnostics Service for CodeNest.
 * Evaluates live database connectivity, circuit breaker status, and memory metrics.
 */

const pool = require('../config/db');
const { geminiCircuitBreaker } = require('../utils/circuitBreaker');

async function performDeepHealthCheck() {
  const startTime = Date.now();
  const diagnostics = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    components: {},
    system: {}
  };

  // 1. Database Connectivity Check
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1;');
    diagnostics.components.database = {
      status: 'up',
      latency_ms: Date.now() - dbStart
    };
  } catch (err) {
    diagnostics.status = 'degraded';
    diagnostics.components.database = {
      status: 'down',
      error: err.message
    };
  }

  // 2. Gemini AI Circuit Breaker Status
  diagnostics.components.ai_circuit_breaker = {
    state: geminiCircuitBreaker.state,
    failures: geminiCircuitBreaker.failureCount,
    status: geminiCircuitBreaker.state === 'OPEN' ? 'degraded' : 'up'
  };

  // 3. System Memory & Process Metrics
  const mem = process.memoryUsage();
  diagnostics.system = {
    uptime_seconds: Math.floor(process.uptime()),
    heap_used_mb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    rss_mb: Math.round((mem.rss / 1024 / 1024) * 100) / 100
  };

  diagnostics.execution_time_ms = Date.now() - startTime;
  return diagnostics;
}

module.exports = { performDeepHealthCheck };
