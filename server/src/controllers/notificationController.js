/**
 * server/src/controllers/notificationController.js
 *
 * Notifications — read-only from the user's perspective.
 * Notifications are created by actions in other controllers,
 * never directly by the user.
 *
 * Identity rule for Shadow-context notifications:
 *   The query returns only notification columns — never joins to
 *   users for any identity field. The message column already
 *   carries the identity-free text set at creation time.
 */

const { query }                                    = require('../config/db');
const ApiError                                     = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse }  = require('../utils/paginate');

// Per-user in-memory notification cache (3-second TTL).
// Key: `${userId}:${context}` — small footprint, auto-expires.
const notifCache = new Map();
const NOTIF_TTL_MS = 3_000;

function getCacheKey(userId, context) {
  return `${userId}:${context || 'all'}`;
}

function bustNotifCache(userId) {
  // Remove all entries for this user across both contexts
  for (const key of notifCache.keys()) {
    if (key.startsWith(`${userId}:`)) notifCache.delete(key);
  }
}

// ── GET /api/notifications ────────────────────────────────────────────────
// ?context=public|shadow  — filter by identity context (required for each bell)
// Default: all notifications, newest first.

async function listNotifications(req, res) {
  const userId  = req.user.id;
  const context = req.query.context; // 'public' | 'shadow' | undefined
  const { page, limit, offset } = parsePagination(req.query);

  // Serve from cache on repeated fast calls (e.g. dual public+shadow bell fetches)
  const cacheKey = getCacheKey(userId, context);
  const cached = notifCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return res.json(cached.data);
  }

  const params  = [userId];
  const where   = ['user_id = $1'];

  if (context) {
    if (!['public', 'shadow'].includes(context)) {
      throw ApiError.badRequest('context must be "public" or "shadow".');
    }
    params.push(context);
    where.push(`identity_context = $${params.length}`);
  }

  const whereClause = `WHERE ${where.join(' AND ')}`;

  const [countResult, dataResult] = await Promise.all([
    query(`SELECT COUNT(*) FROM notifications ${whereClause}`, params),
    query(
      // SECURITY: Only notification's own columns returned.
      // No join to users — message text is already identity-free.
      `SELECT id, type, message, reference_id, identity_context, is_read, created_at
       FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  const payload = buildPaginatedResponse(dataResult.rows, total, page, limit);

  // Store in cache
  notifCache.set(cacheKey, { data: payload, expiry: Date.now() + NOTIF_TTL_MS });

  return res.json(payload);
}

// ── PUT /api/notifications/:id/read ──────────────────────────────────────
// Owner-only at the query level.

async function markOneRead(req, res) {
  const notifId = parseInt(req.params.id, 10);
  const userId  = req.user.id;

  const { rowCount } = await query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
    [notifId, userId]
  );

  if (!rowCount) throw ApiError.forbidden('Notification not found or not yours.');
  bustNotifCache(userId);
  return res.json({ message: 'Notification marked as read.' });
}

// ── PUT /api/notifications/read-all ──────────────────────────────────────
// Mark all of current user's notifications read. Optional ?context= scoping.

async function markAllRead(req, res) {
  const userId  = req.user.id;
  const context = req.query.context;

  const params = [userId];
  const where  = ['user_id = $1'];

  if (context) {
    if (!['public', 'shadow'].includes(context)) {
      throw ApiError.badRequest('context must be "public" or "shadow".');
    }
    params.push(context);
    where.push(`identity_context = $${params.length}`);
  }

  await query(
    `UPDATE notifications SET is_read = TRUE WHERE ${where.join(' AND ')}`,
    params
  );

  bustNotifCache(userId);
  return res.json({ message: 'All notifications marked as read.' });
}

module.exports = { listNotifications, markOneRead, markAllRead };
