/**
 * server/src/utils/circuitBreaker.js
 * 
 * Lightweight, zero-dependency Circuit Breaker Pattern implementation
 * for Gemini AI API resilience & third-party fault tolerance.
 * 
 * States:
 *   - CLOSED: Normal operation. Requests pass through.
 *   - OPEN: Circuit tripped due to consecutive failures. Requests instantly fail-open/fallback.
 *   - HALF_OPEN: Cooldown expired. Testing single trial request to verify downstream recovery.
 */

class CircuitBreaker {
  constructor({ failureThreshold = 3, cooldownMs = 30000, name = 'GeminiAI' } = {}) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttempt = Date.now();
  }

  async execute(actionFn, fallbackFn) {
    // 1. Check if OPEN state cooldown has expired
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN';
        console.warn(`[CircuitBreaker:${this.name}] Cooldown expired. Switching to HALF_OPEN trial state.`);
      } else {
        console.warn(`[CircuitBreaker:${this.name}] Circuit is OPEN. Bypassing downstream call, executing fallback.`);
        return fallbackFn ? fallbackFn(new Error(`CircuitBreaker[${this.name}] is OPEN`)) : null;
      }
    }

    // 2. Attempt target action execution
    try {
      const result = await actionFn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      if (fallbackFn) {
        return fallbackFn(error);
      }
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      console.log(`[CircuitBreaker:${this.name}] Downstream health verified. Resetting state to CLOSED.`);
      this.state = 'CLOSED';
    }
  }

  onFailure(error) {
    this.failureCount++;
    console.error(`[CircuitBreaker:${this.name}] Failure #${this.failureCount}:`, error.message || error);

    if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.cooldownMs;
      console.error(`[CircuitBreaker:${this.name}] Threshold reached (${this.failureCount}/${this.failureThreshold}). Circuit TRIPPED OPEN for ${this.cooldownMs}ms.`);
    }
  }
}

// Singleton Circuit Breaker instance for Gemini AI calls
const geminiCircuitBreaker = new CircuitBreaker({
  name: 'GeminiAI',
  failureThreshold: 3,
  cooldownMs: 30000 // 30 second cooldown
});

module.exports = { CircuitBreaker, geminiCircuitBreaker };
