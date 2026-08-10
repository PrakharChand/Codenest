/**
 * server/src/utils/dbTransactionRetry.js
 * 
 * Database Transaction Auto-Retry & Deadlock Handler for CodeNest.
 * Automatically retries PostgreSQL transactions when transient concurrency deadlocks (40P01)
 * or serialization anomalies (40001) occur during high database concurrency.
 */

const pool = require('../config/db');

async function withTransactionRetry(transactionFn, { maxRetries = 3, initialDelayMs = 100 } = {}) {
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await transactionFn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});

      // PostgreSQL Deadlock (40P01) or Serialization Failure (40001)
      const isDeadlock = err.code === '40P01' || err.code === '40001';
      if (isDeadlock && attempt < maxRetries) {
        const jitterMs = Math.floor(Math.random() * 50);
        const delay = initialDelayMs * Math.pow(2, attempt - 1) + jitterMs;

        console.warn(`[DBTransactionRetry] Deadlock/Serialization anomaly (${err.code}) detected. Retrying transaction attempt ${attempt}/${maxRetries} in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    } finally {
      client.release();
    }
  }
}

module.exports = { withTransactionRetry };
