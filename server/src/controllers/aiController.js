/**
 * server/src/controllers/aiController.js
 *
 * Thin route handlers that validate input, call aiService,
 * and return results or their safe fallbacks.
 *
 * Every route applies aiLimiter (20 req/hour/IP) — applied at route level.
 * All wrapped in asyncHandler at the route level.
 */

const { query }    = require('../config/db');
const ApiError     = require('../utils/ApiError');
const {
  suggestTags,
  anonymityCheck,
  generateRoadmap,
  suggestConnections,
} = require('../services/aiService');

// ── POST /api/ai/suggest-tags ─────────────────────────────────────────────
// Body: { content } — require ≥100 chars

async function suggestTagsRoute(req, res) {
  const { content } = req.body;
  if (!content || content.length < 100) {
    throw ApiError.badRequest('Content must be at least 100 characters for tag suggestions.');
  }
  const result = await suggestTags(content);
  return res.json(result);
}

// ── POST /api/ai/anonymity-check ──────────────────────────────────────────
// Body: { text } — advisory only, fail-open

async function anonymityCheckRoute(req, res) {
  const { text } = req.body;
  if (!text || !text.trim()) {
    throw ApiError.badRequest('text is required.');
  }
  const result = await anonymityCheck(text);
  return res.json(result);
}

// ── POST /api/ai/generate-roadmap ─────────────────────────────────────────
// Body: { level, knownTech, goal, hoursPerWeek }

async function generateRoadmapRoute(req, res) {
  const { level, knownTech, goal, hoursPerWeek } = req.body;

  if (!level || !knownTech || !goal || !hoursPerWeek) {
    throw ApiError.badRequest('level, knownTech, goal, and hoursPerWeek are all required.');
  }
  if (goal.length < 20) {
    throw ApiError.badRequest('Goal must be at least 20 characters.');
  }

  const roadmapData = await generateRoadmap({ level, knownTech, goal, hoursPerWeek });

  if (!roadmapData) {
    // AI failed — return a clear message, no partial write
    return res.status(503).json({
      error: { code: 'AI_UNAVAILABLE', message: "Couldn't generate a roadmap right now. Please try again shortly." },
    });
  }

  // Upsert: one roadmap per user — regenerate overwrites
  await query(
    `INSERT INTO user_roadmaps (user_id, roadmap_data, generated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET roadmap_data = EXCLUDED.roadmap_data, generated_at = EXCLUDED.generated_at`,
    [req.user.id, JSON.stringify(roadmapData)]
  );

  return res.json({ roadmap: roadmapData });
}

// ── POST /api/ai/suggest-connections ─────────────────────────────────────
// Public-identity only — never reads Shadow data.

async function suggestConnectionsRoute(req, res) {
  const userId = req.user.id;

  // Fetch current user's recent posts
  const { rows: myPosts } = await query(
    `SELECT id, title FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [userId]
  );

  // Fetch candidate users' recent posts:
  // Exclude self and already-connected users at query level (Phase 3 pattern)
  const { rows: candidates } = await query(
    `SELECT u.id AS user_id, STRING_AGG(p.title, ', ' ORDER BY p.created_at DESC) AS titles
     FROM users u
     JOIN posts p ON p.user_id = u.id AND p.visibility = 'public'
     WHERE u.id <> $1
       AND NOT EXISTS (
         SELECT 1 FROM connections c
         WHERE c.follower_id = $1 AND c.following_id = u.id
       )
     GROUP BY u.id
     ORDER BY MAX(p.created_at) DESC
     LIMIT 30`,
    [userId]
  );

  const result = await suggestConnections(myPosts, candidates);
  return res.json(result);
}

module.exports = { suggestTagsRoute, anonymityCheckRoute, generateRoadmapRoute, suggestConnectionsRoute };
