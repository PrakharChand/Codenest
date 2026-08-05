/**
 * server/src/controllers/aiController.js
 *
 * Route handlers for Google Gemini AI features.
 */

const { query } = require('../config/db');
const ApiError  = require('../utils/ApiError');
const {
  suggestTags,
  anonymityCheck,
  generateRoadmap,
} = require('../services/aiService');
const {
  getSmartRecommendations,
  markCandidatesShown,
  dismissRecommendation,
} = require('../services/recommendationService');

// ── POST /api/ai/suggest-tags ─────────────────────────────────────────────
async function suggestTagsRoute(req, res) {
  const { content } = req.body;
  if (!content || content.trim().length < 10) {
    throw ApiError.badRequest('Content must be at least 10 characters for tag suggestions.');
  }

  const result = await suggestTags(content, req.user?.id);
  return res.json(result);
}

// ── POST /api/ai/anonymity-check ──────────────────────────────────────────
async function anonymityCheckRoute(req, res) {
  const { text } = req.body;
  if (!text || !text.trim()) {
    throw ApiError.badRequest('text is required.');
  }

  const result = await anonymityCheck(text, req.user?.id);
  return res.json(result);
}

// ── POST /api/ai/generate-roadmap ─────────────────────────────────────────
async function generateRoadmapRoute(req, res) {
  let { level, knownTech, known_tech, goal, hoursPerWeek, hours_per_week } = req.body;

  // Normalize aliases (knownTech vs known_tech, hoursPerWeek vs hours_per_week)
  knownTech = knownTech || known_tech;
  hoursPerWeek = hoursPerWeek || hours_per_week;

  if (Array.isArray(knownTech)) {
    knownTech = knownTech.join(', ');
  }

  if (!level || !knownTech || !goal || !hoursPerWeek) {
    throw ApiError.badRequest('level, knownTech, goal, and hoursPerWeek are all required.');
  }
  if (goal.length < 20) {
    throw ApiError.badRequest('Goal must be at least 20 characters.');
  }

  const roadmapData = await generateRoadmap(
    { level, knownTech, goal, hoursPerWeek: Number(hoursPerWeek) },
    req.user?.id
  );

  if (!roadmapData || roadmapData.fallback || !roadmapData.phases?.length) {
    return res.status(503).json({
      error: {
        code: 'AI_UNAVAILABLE',
        message: "Couldn't generate a roadmap right now. Please try again shortly.",
      },
    });
  }

  // Upsert user roadmap
  await query(
    `INSERT INTO user_roadmaps (user_id, roadmap_data, generated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET roadmap_data = EXCLUDED.roadmap_data, generated_at = EXCLUDED.generated_at`,
    [req.user.id, JSON.stringify(roadmapData)]
  );

  return res.json({ roadmap: roadmapData });
}

// ── GET & POST /api/ai/suggest-connections ────────────────────────────────
async function suggestConnectionsRoute(req, res) {
  const userId = req.user.id;
  const forceRefresh = req.body?.refresh || req.query?.refresh === 'true';

  const recommendations = await getSmartRecommendations(userId, { limit: 5, forceRefresh });

  // Record shown candidates for 24h cooldown tracking
  const shownIds = recommendations.map((r) => r.user_id);
  markCandidatesShown(userId, shownIds).catch(() => {});

  return res.json({ suggestions: recommendations });
}

// ── POST /api/ai/suggest-connections/dismiss ──────────────────────────────
async function dismissConnectionSuggestionRoute(req, res) {
  const userId = req.user.id;
  const candidateId = Number(req.body.candidateId || req.body.candidate_id);
  if (!candidateId || isNaN(candidateId)) {
    throw ApiError.badRequest('candidateId is required.');
  }

  await dismissRecommendation(userId, candidateId);

  // Return updated fresh recommendations immediately
  const recommendations = await getSmartRecommendations(userId, { limit: 5, forceRefresh: true });
  return res.json({ suggestions: recommendations });
}

module.exports = {
  suggestTagsRoute,
  anonymityCheckRoute,
  generateRoadmapRoute,
  suggestConnectionsRoute,
  dismissConnectionSuggestionRoute,
};
