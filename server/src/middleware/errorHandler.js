/**
 * server/src/middleware/errorHandler.js
 *
 * Terminal error middleware — MUST be mounted last in app.js.
 *
 * Normalizes ALL errors to the locked JSON shape:
 *   { error: { code, message, field? } }
 *
 * Security rules enforced here (Identity Rule 6 spirit):
 *   - Raw stack traces are NEVER sent to the client.
 *   - Raw SQL / Postgres error text is NEVER sent to the client.
 *   - Postgres unique-violation (23505) → clean 409 CONFLICT.
 *   - Postgres FK violation (23503) → clean 400 BAD_REQUEST.
 *   - Unknown errors → generic 500, full error logged server-side only.
 */

const ApiError = require('../utils/ApiError');

// Postgres error codes we handle explicitly
const PG_UNIQUE_VIOLATION = '23505';
const PG_FK_VIOLATION     = '23503';
const PG_CHECK_VIOLATION  = '23514';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // ── 1. Convert known Postgres errors to ApiError ─────────────────────
  if (err.code === PG_UNIQUE_VIOLATION) {
    // Extract column name from Postgres detail if available
    const match = err.detail && err.detail.match(/Key \((.+?)\)=/);
    const field = match ? match[1] : undefined;
    err = ApiError.conflict(
      field ? `${field} is already in use.` : 'A resource with that value already exists.',
      field
    );
  } else if (err.code === PG_FK_VIOLATION) {
    err = ApiError.badRequest('Referenced resource does not exist.');
  } else if (err.code === PG_CHECK_VIOLATION) {
    err = ApiError.badRequest('The request contains an invalid value.');
  }

  // ── 2. Determine status and shape ────────────────────────────────────
  const isApiError   = err instanceof ApiError;
  const statusCode   = isApiError ? err.statusCode : 500;
  const code         = isApiError ? err.code        : 'INTERNAL_ERROR';
  const message      = isApiError ? err.message     : 'An unexpected error occurred.';

  // ── 3. Log server-side (never expose internals to client) ────────────
  if (!isApiError || statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.path} → ${statusCode}`);
    console.error(err.stack || err);
  }

  // ── 4. Send locked JSON shape ─────────────────────────────────────────
  const body = {
    error: {
      code,
      message,
      ...(err.field !== undefined ? { field: err.field } : {}),
    },
  };

  return res.status(statusCode).json(body);
}

module.exports = errorHandler;
