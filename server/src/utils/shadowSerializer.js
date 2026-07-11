/**
 * server/src/utils/shadowSerializer.js
 *
 * SECURITY — Identity Rule 2:
 * This is the SOLE formatter for any /api/shadow/ response that includes
 * user identity data. It is structurally incapable of returning public
 * identity fields: name, email, password_hash, avatar_url, bio, github_url,
 * or twitter_url. These are not in its allow-list.
 *
 * Usage contract:
 *   1. Shadow SQL queries SELECT only anonymous columns (first-layer defense).
 *   2. All results pass through this serializer before res.json() (second layer).
 *   3. No shadow route may ever call res.json(rawDbRow) directly.
 *
 * Building this in Phase 2 means Phase 4 controllers physically import a
 * ready-made guard and cannot accidentally omit the safety step.
 */

/**
 * Fields this serializer is ALLOWED to return.
 * Anything not in this list is stripped silently.
 * Public identity fields are intentionally absent from this list.
 */
const SHADOW_USER_FIELDS = new Set([
  'id',
  'anonymous_username',
  'anonymous_avatar_url',
  'anonymous_reputation_score',
  'has_anonymous_identity',
  'created_at',
]);

/**
 * serializeShadowUser(row)
 *
 * Accepts a raw DB row and returns only the anonymous-safe fields.
 * @param {object|null} row
 * @returns {object|null}
 */
function serializeShadowUser(row) {
  if (!row) return null;
  const safe = {};
  for (const key of SHADOW_USER_FIELDS) {
    if (key in row) safe[key] = row[key];
  }
  return safe;
}

/**
 * serializeShadowUsers(rows)
 * @param {object[]} rows
 * @returns {object[]}
 */
function serializeShadowUsers(rows) {
  return Array.isArray(rows) ? rows.map(serializeShadowUser) : [];
}

/**
 * serializeShadowIdentityResponse(row)
 *
 * Specifically for the anonymous identity creation endpoint:
 * returns the fields the client needs to know after creation.
 * @param {object} row
 * @returns {object}
 */
function serializeShadowIdentityResponse(row) {
  return {
    anonymous_username:         row.anonymous_username,
    anonymous_avatar_url:       row.anonymous_avatar_url,
    anonymous_reputation_score: row.anonymous_reputation_score,
    has_anonymous_identity:     row.has_anonymous_identity,
  };
}

module.exports = {
  serializeShadowUser,
  serializeShadowUsers,
  serializeShadowIdentityResponse,
  SHADOW_USER_FIELDS,
};
