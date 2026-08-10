/**
 * server/src/services/auditService.js
 * 
 * Centralized Audit Logging Service for CodeNest.
 * Logs critical domain events (soft deletes, bans, role changes, auth security events)
 * to PostgreSQL audit_logs table asynchronously.
 */

const pool = require('../config/db');

async function logAuditEvent({ userId = null, action, entityType, entityId = null, metadata = {}, ipAddress = null }) {
  try {
    const query = `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;
    const values = [userId, action, entityType, entityId, JSON.stringify(metadata), ipAddress];
    const { rows } = await pool.query(query, values);
    return rows[0].id;
  } catch (err) {
    console.error('[AuditService] Failed to write audit log event:', err.message);
    return null;
  }
}

module.exports = { logAuditEvent };
