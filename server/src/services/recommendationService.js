/**
 * server/src/services/recommendationService.js
 *
 * Production-grade Smart Developer Recommendation Engine for CodeNest.
 * Inspired by LinkedIn, GitHub, Twitter/X, and Discord algorithm design.
 *
 * Algorithm Breakdown:
 *  1. Multi-factor Weighted Scoring (0 - 100 points):
 *     • 35% Recent Activity (Logged in, posts, comments, shadow reviews)
 *     • 25% Similar Technologies & Topics (Post tags, known tech, roadmaps)
 *     • 20% Engagement & Reputation (Posts, likes, comments, reputation score)
 *     • 10% Mutual Connections (Shared followings / followers)
 *     • 10% Freshness Boost (Visibility for new users joined in last 14 days)
 *
 *  2. Strict Exclusions:
 *     • Excludes self (user_id = targetUserId)
 *     • Excludes already followed/connected users
 *     • Excludes pending connection requests (both directions)
 *     • Excludes candidates on 24-hour cooldown or dismissed list
 *
 *  3. Dynamic Rotation & Cooldown Tracking:
 *     • Stores 'shown', 'dismissed', and 'connected' actions in recommendation_cooldowns
 *     • Cooldown of 24h for shown candidates (gracefully relaxed if candidate pool is small)
 *     • Permanent exclusion for dismissed or connected candidates
 *
 *  4. In-Memory Performance Caching:
 *     • Caches candidate recommendations per user for fast response times
 *     • Invalidated instantly on dismiss/connect actions to feed the next candidate seamlessly
 */

const { query } = require('../config/db');

// In-memory cache for user recommendations (15-minute TTL)
const recCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

function getCacheKey(userId) {
  return `recs:user:${userId}`;
}

function getCachedRecs(userId) {
  const item = recCache.get(getCacheKey(userId));
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    recCache.delete(getCacheKey(userId));
    return null;
  }
  return item.candidates;
}

function setCachedRecs(userId, candidates) {
  recCache.set(getCacheKey(userId), { candidates, timestamp: Date.now() });
  if (recCache.size > 1000) {
    const firstKey = recCache.keys().next().value;
    recCache.delete(firstKey);
  }
}

function clearUserRecCache(userId) {
  recCache.delete(getCacheKey(userId));
}

/**
 * Fetch candidate user details + candidate activity signals
 */
async function fetchUserContext(userId) {
  // Fetch logged-in user's tech tags / topics from their posts and roadmaps
  const { rows: postTags } = await query(
    `SELECT DISTINCT LOWER(t.name) AS tag
     FROM post_tags pt
     JOIN tags t ON t.id = pt.tag_id
     JOIN posts p ON p.id = pt.post_id
     WHERE p.user_id = $1`,
    [userId]
  );

  const { rows: roadmapRows } = await query(
    `SELECT roadmap_data FROM user_roadmaps WHERE user_id = $1 LIMIT 1`,
    [userId]
  );

  const myTags = new Set(postTags.map((r) => r.tag));
  if (roadmapRows.length > 0 && roadmapRows[0].roadmap_data) {
    try {
      const data = typeof roadmapRows[0].roadmap_data === 'string'
        ? JSON.parse(roadmapRows[0].roadmap_data)
        : roadmapRows[0].roadmap_data;
      if (data.knownTech) {
        data.knownTech.split(',').map((t) => t.trim().toLowerCase()).forEach((t) => t && myTags.add(t));
      }
    } catch (_) {}
  }

  // Fetch logged-in user's followings for mutual connection computation
  const { rows: followings } = await query(
    `SELECT following_id FROM connections WHERE follower_id = $1`,
    [userId]
  );
  const myFollowingIds = new Set(followings.map((r) => r.following_id));

  return { myTags: Array.from(myTags), myFollowingIds };
}

/**
 * Generate smart developer recommendations for a given user.
 */
async function getSmartRecommendations(userId, options = {}) {
  const limit = options.limit || 5;
  const forceRefresh = options.forceRefresh || false;

  if (!forceRefresh) {
    const cached = getCachedRecs(userId);
    if (cached && cached.length >= limit) {
      return cached.slice(0, limit);
    }
  }

  const { myTags, myFollowingIds } = await fetchUserContext(userId);

  // SQL Query to select eligible candidates with aggregated signal stats
  // First attempt with 24-hour cooldown filtering for 'shown' & 'dismissed'
  const fetchCandidates = async (strictCooldown = true) => {
    const cooldownClause = strictCooldown
      ? `AND NOT EXISTS (
           SELECT 1 FROM recommendation_cooldowns rc
           WHERE rc.user_id = $1 AND rc.candidate_id = u.id
             AND rc.action IN ('dismissed', 'connected')
             OR (rc.user_id = $1 AND rc.candidate_id = u.id AND rc.action = 'shown' AND rc.created_at >= NOW() - INTERVAL '24 hours')
         )`
      : `AND NOT EXISTS (
           SELECT 1 FROM recommendation_cooldowns rc
           WHERE rc.user_id = $1 AND rc.candidate_id = u.id
             AND rc.action IN ('dismissed', 'connected')
         )`;

    const sql = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        u.bio,
        u.created_at AS joined_at,
        (SELECT COUNT(*)::int FROM posts WHERE user_id = u.id) AS post_count,
        (SELECT COUNT(*)::int FROM comments WHERE user_id = u.id) AS comment_count,
        (SELECT COUNT(*)::int FROM shadow_submissions WHERE user_id = u.id) AS shadow_sub_count,
        (SELECT COUNT(*)::int FROM shadow_reviews WHERE reviewer_id = u.id) AS shadow_review_count,
        (
          SELECT MAX(created_at) FROM (
            SELECT created_at FROM posts WHERE user_id = u.id
            UNION ALL
            SELECT created_at FROM comments WHERE user_id = u.id
            UNION ALL
            SELECT created_at FROM shadow_submissions WHERE user_id = u.id
            UNION ALL
            SELECT created_at FROM shadow_reviews WHERE reviewer_id = u.id
          ) AS user_acts
        ) AS last_active_at,
        (
          SELECT COALESCE(STRING_AGG(DISTINCT LOWER(t.name), ','), '')
          FROM post_tags pt
          JOIN tags t ON t.id = pt.tag_id
          JOIN posts p ON p.id = pt.post_id
          WHERE p.user_id = u.id
        ) AS candidate_tags,
        (
          SELECT ARRAY_AGG(following_id)
          FROM connections
          WHERE follower_id = u.id
        ) AS candidate_following_ids
      FROM users u
      WHERE u.id <> $1
        -- Exclude already connected/followed
        AND NOT EXISTS (
          SELECT 1 FROM connections c
          WHERE c.follower_id = $1 AND c.following_id = u.id
        )
        -- Exclude pending connection requests
        AND NOT EXISTS (
          SELECT 1 FROM connection_requests cr
          WHERE (cr.requester_id = $1 AND cr.requestee_id = u.id)
             OR (cr.requester_id = u.id AND cr.requestee_id = $1)
             AND cr.status = 'pending'
        )
        ${cooldownClause}
      LIMIT 100
    `;

    const res = await query(sql, [userId]);
    return res.rows;
  };

  let rows = await fetchCandidates(true);
  // Fallback: If strict 24h 'shown' cooldown yields fewer candidates than requested, relax 'shown' cooldown
  if (rows.length < limit) {
    rows = await fetchCandidates(false);
  }

  const now = Date.now();

  // Score candidates (0 to 100 points)
  const scored = rows.map((candidate) => {
    let score = 0;
    const reasons = [];

    // 1. Recent Activity Score (Max 35 points)
    if (candidate.last_active_at) {
      const diffHours = (now - new Date(candidate.last_active_at).getTime()) / (1000 * 60 * 60);
      if (diffHours <= 24) {
        score += 35;
        if (candidate.shadow_review_count > 0) {
          reasons.push('Recently active in Shadow reviews');
        } else {
          reasons.push('Recently active on CodeNest');
        }
      } else if (diffHours <= 72) {
        score += 25;
        reasons.push('Active in the last few days');
      } else if (diffHours <= 168) {
        score += 15;
      } else {
        score += 5;
      }
    }

    // 2. Similar Technologies & Interests (Max 25 points)
    const cTags = (candidate.candidate_tags || '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (candidate.bio) {
      candidate.bio.toLowerCase().split(/\W+/).forEach((word) => {
        if (word.length > 2) cTags.push(word);
      });
    }

    const matchingTech = myTags.filter((tag) => cTags.includes(tag));
    if (matchingTech.length > 0) {
      const techScore = Math.min(25, matchingTech.length * 9);
      score += techScore;
      const formattedTech = matchingTech
        .slice(0, 2)
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
        .join(' & ');
      reasons.unshift(`Both of you share ${formattedTech}`);
    }

    // 3. Mutual Connections (Max 20 points)
    const candidateFollowings = new Set(candidate.candidate_following_ids || []);
    let mutualCount = 0;
    for (const fId of candidateFollowings) {
      if (myFollowingIds.has(fId)) mutualCount++;
    }

    if (mutualCount > 0) {
      const mutualScore = Math.min(20, mutualCount * 7);
      score += mutualScore;
      reasons.unshift(`You share ${mutualCount} mutual connection${mutualCount > 1 ? 's' : ''}`);
    }

    // 4. Activity & Engagement (Max 10 points)
    const totalEngage = (candidate.post_count || 0) * 2 + (candidate.comment_count || 0) + (candidate.shadow_sub_count || 0);
    const engageScore = Math.min(10, Math.floor(totalEngage / 2));
    score += engageScore;
    if (totalEngage >= 5 && reasons.length < 2) {
      reasons.push(`Frequent contributor with ${candidate.post_count} posts`);
    }

    // 5. Freshness / New User Boost (Max 10 points)
    if (candidate.joined_at) {
      const daysJoined = (now - new Date(candidate.joined_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysJoined <= 14) {
        score += 10;
        if (reasons.length === 0) {
          reasons.push('New developer who joined CodeNest recently');
        }
      }
    }

    // Final fallback reason if none matched
    const primaryReason = reasons[0] || 'Active developer with matching interests';

    return {
      user_id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      avatar_url: candidate.avatar_url,
      bio: candidate.bio,
      score,
      reason: primaryReason,
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const finalCandidates = scored.slice(0, limit * 3); // cache top pool
  setCachedRecs(userId, finalCandidates);

  return finalCandidates.slice(0, limit);
}

/**
 * Record a 'shown' cooldown entry for displayed candidates
 */
async function markCandidatesShown(userId, candidateIds) {
  if (!userId || !Array.isArray(candidateIds) || candidateIds.length === 0) return;
  try {
    for (const cid of candidateIds) {
      await query(
        `INSERT INTO recommendation_cooldowns (user_id, candidate_id, action)
         VALUES ($1, $2, 'shown')
         ON CONFLICT DO NOTHING`,
        [userId, cid]
      );
    }
  } catch (err) {
    // Non-blocking log
    console.warn('[recommendationService] Error marking candidates shown:', err.message);
  }
}

/**
 * Dismiss a candidate recommendation
 */
async function dismissRecommendation(userId, candidateId) {
  if (!userId || !candidateId) return;

  await query(
    `INSERT INTO recommendation_cooldowns (user_id, candidate_id, action)
     VALUES ($1, $2, 'dismissed')
     ON CONFLICT DO NOTHING`,
    [userId, candidateId]
  );

  clearUserRecCache(userId);
}

/**
 * Record a connection action
 */
async function recordConnectionAction(userId, candidateId) {
  if (!userId || !candidateId) return;

  await query(
    `INSERT INTO recommendation_cooldowns (user_id, candidate_id, action)
     VALUES ($1, $2, 'connected')
     ON CONFLICT DO NOTHING`,
    [userId, candidateId]
  );

  clearUserRecCache(userId);
}

module.exports = {
  getSmartRecommendations,
  markCandidatesShown,
  dismissRecommendation,
  recordConnectionAction,
  clearUserRecCache,
};
