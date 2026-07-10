/**
 * shadowSerializer
 *
 * SECURITY: The ONLY place in the codebase allowed to format a Shadow response.
 * It has explicit access to only the anonymous columns — it can never see or
 * return real-identity fields (name, email, password_hash, avatar_url, bio,
 * github_url, twitter_url).
 *
 * Identity Rule 2 enforcement: queries feeding this serializer must already
 * SELECT only anonymous columns. This serializer is a second-layer guard.
 */
const ALLOWED_SHADOW_FIELDS = [
  'id',
  'anonymous_username',
  'anonymous_avatar_url',
  'anonymous_reputation_score',
  'has_anonymous_identity',
  'created_at',
  // Submission / review fields added here as Schema is finalized in Phase 1
];

/**
 * Serialize a single shadow user object.
 * Strips any field not in the allow-list.
 * @param {object} row - raw DB row
 * @returns {object} safe shadow user
 */
function serializeShadowUser(row) {
  if (!row) return null;
  return ALLOWED_SHADOW_FIELDS.reduce((acc, field) => {
    if (field in row) acc[field] = row[field];
    return acc;
  }, {});
}

/**
 * Serialize an array of shadow user rows.
 * @param {object[]} rows
 * @returns {object[]}
 */
function serializeShadowUsers(rows) {
  return (rows || []).map(serializeShadowUser);
}

module.exports = { serializeShadowUser, serializeShadowUsers, ALLOWED_SHADOW_FIELDS };
