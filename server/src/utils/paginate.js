/**
 * server/src/utils/paginate.js
 *
 * Shared pagination utility — every list endpoint in the project uses this.
 * No route hand-rolls pagination.
 *
 * Convention (locked in CODENEST_REFERENCE.md):
 *   Query params: ?page (default 1), ?limit (default 20, hard max 50 — clamped)
 *   Response envelope:
 *     { data: [...], pagination: { page, limit, total, totalPages, hasNext } }
 *
 * Usage in a controller:
 *   const { offset, limit, page } = parsePagination(req.query);
 *   const { rows: data } = await query('SELECT ... LIMIT $1 OFFSET $2', [limit, offset]);
 *   const { rows: [{ count }] } = await query('SELECT COUNT(*) ...', []);
 *   return res.json(buildPaginatedResponse(data, parseInt(count), page, limit));
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 50;

/**
 * parsePagination(query)
 * Reads and clamps page/limit from req.query.
 * @param {{ page?: string, limit?: string }} query - req.query
 * @returns {{ page: number, limit: number, offset: number }}
 */
function parsePagination(query = {}) {
  let page  = parseInt(query.page,  10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page)  || page  < 1) page  = 1;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT)         limit = MAX_LIMIT;   // clamp — never trust client

  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * buildPaginatedResponse(data, total, page, limit)
 * Builds the standard envelope from a rows array and a total count.
 * @param {Array}  data  - rows for this page
 * @param {number} total - total matching rows (from COUNT query)
 * @param {number} page
 * @param {number} limit
 * @returns {{ data: Array, pagination: object }}
 */
function buildPaginatedResponse(data, total, page, limit) {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
    },
  };
}

module.exports = { parsePagination, buildPaginatedResponse };
