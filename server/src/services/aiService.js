/**
 * server/src/services/aiService.js
 *
 * All Anthropic Claude API calls go through this service.
 *
 * Conventions (all locked in CODENEST_REFERENCE.md):
 *   - 10-second timeout: AbortController, cleared on success.
 *   - try/catch + safe fallback: a failed AI call NEVER breaks the
 *     surrounding user action. The route returns its fallback.
 *   - JSON-only response contract: every prompt instructs Claude to
 *     return ONLY JSON, no prose or markdown wrapper.
 *   - Defensive JSON parse: on parse failure, return the fallback.
 *   - aiLimiter from rateLimit.js: applied at the route level, not here.
 *
 * Five features, in build order:
 *   1. suggestTags
 *   2. anonymityCheck      ← most product-critical
 *   3. generateRoadmap
 *   4. suggestConnections
 *   5. generateAIReview    ← used by the cron job, not a user route
 */

const { anthropic, CLAUDE_MODEL } = require('../config/anthropic');

const AI_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * callClaude(prompt, fallback)
 * Core wrapper: timeout + try/catch + JSON parse + fallback.
 * @param {string} prompt
 * @param {*} fallback
 * @returns {Promise<*>}
 */
async function callClaude(prompt, fallback) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await anthropic.messages.create(
      {
        model:      CLAUDE_MODEL,
        max_tokens: 1024,
        messages:   [{ role: 'user', content: prompt }],
      },
      { signal: controller.signal }
    );

    clearTimeout(timer);

    const text = response.content?.[0]?.text ?? '';
    // Strip any markdown code fences if Claude adds them despite instructions
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[aiService] Claude call failed (${err.name}: ${err.message}). Returning fallback.`);
    return fallback;
  }
}

// ── 1. suggestTags ────────────────────────────────────────────────────────

/**
 * @param {string} content - post or submission content (≥100 chars enforced at route level)
 * @returns {{ tags: string[] }} - 4–6 lowercase tags, or { tags: [] } on failure
 */
async function suggestTags(content) {
  const prompt = `You are a tag-suggestion engine for a developer platform.
Given the following code or post content, return ONLY a JSON object with a single key "tags"
containing an array of 4 to 6 lowercase, single-word or hyphenated tags that best categorize it.
No prose, no markdown, no explanation — only the JSON object.

Example output: {"tags":["javascript","react","hooks","state-management"]}

Content:
${content.slice(0, 4000)}`;

  return callClaude(prompt, { tags: [] });
}

// ── 2. anonymityCheck ─────────────────────────────────────────────────────

/**
 * Most product-critical AI feature: warns the user if their Shadow submission
 * text might contain identity-revealing information.
 *
 * Fail-open design: if AI is down, returns { safe: true, findings: [] }.
 * The guard is advisory — it warns, never blocks. The frontend decides what to show.
 * This route is called client-side BEFORE the Phase 4 submit call.
 *
 * @param {string} text - submission text to analyze
 * @returns {{ safe: boolean, findings: Array<{ type, value, suggestion }> }}
 */
async function anonymityCheck(text) {
  const prompt = `You are an anonymity guard for a code-review platform where all submissions must be anonymous.
Scan the following text for any information that could identify the real author:
  - Real names
  - Email addresses
  - GitHub or Twitter/X handles
  - Company or employer names
  - University or college names

Return ONLY a JSON object with this exact shape:
{
  "safe": true|false,
  "findings": [
    { "type": "name|email|github|twitter|company|university", "value": "the detected text", "suggestion": "how to anonymize it" }
  ]
}
"safe" is true only if findings is an empty array.
No prose, no markdown, no explanation — only the JSON object.

Text to analyze:
${text.slice(0, 8000)}`;

  // Fail-open: if AI is down, do not block the submission
  return callClaude(prompt, { safe: true, findings: [] });
}

// ── 3. generateRoadmap ────────────────────────────────────────────────────

/**
 * @param {{ level, knownTech, goal, hoursPerWeek }} profile
 * @returns {object} structured roadmap JSON, or null on failure
 */
async function generateRoadmap({ level, knownTech, goal, hoursPerWeek }) {
  const prompt = `You are a senior software engineering mentor.
Generate a personalized learning roadmap for a developer with this profile:
  - Skill level: ${level}
  - Known technologies: ${knownTech}
  - Learning goal: ${goal}
  - Available hours per week: ${hoursPerWeek}

Return ONLY a JSON object with this shape:
{
  "phases": [
    {
      "title": "Phase name",
      "duration_weeks": 4,
      "topics": ["topic1", "topic2"],
      "resources": [{ "title": "...", "url": "...", "type": "course|book|docs|video" }],
      "milestone": "What the learner can do after this phase"
    }
  ],
  "total_weeks": 12,
  "summary": "One sentence summary of the roadmap"
}
No prose, no markdown, no explanation — only the JSON object.`;

  return callClaude(prompt, null);
}

// ── 4. suggestConnections ─────────────────────────────────────────────────

/**
 * Reads current user's recent posts + other users' recent posts.
 * Returns suggestions with a reason string.
 * Public-identity only — never reads Shadow data.
 *
 * The actual DB reads happen in aiController; this function just wraps the Claude call.
 * @param {object[]} myPosts - current user's recent posts
 * @param {object[]} candidates - other users' recent posts (already query-level excluded: self + already-connected)
 * @returns {{ suggestions: Array<{ user_id: number, reason: string }> }}
 */
async function suggestConnections(myPosts, candidates) {
  if (!candidates.length) return { suggestions: [] };

  const myTopics    = myPosts.map((p) => p.title).join(', ') || 'various topics';
  const candidatesText = candidates.slice(0, 20).map((c) =>
    `user_id:${c.user_id}, posts: ${c.titles}`
  ).join('\n');

  const prompt = `You are a developer connection recommender.
The current user writes about: ${myTopics}

Candidate users and their recent post topics:
${candidatesText}

Return ONLY a JSON object with this shape:
{
  "suggestions": [
    { "user_id": 42, "reason": "One sentence on why they would make a good connection" }
  ]
}
Include at most 5 suggestions, ranked by relevance. No prose, no markdown — only the JSON object.`;

  return callClaude(prompt, { suggestions: [] });
}

// ── 5. generateAIReview ───────────────────────────────────────────────────

/**
 * Used by the cron job — not a user-facing route.
 * Generates a structured code review for a Shadow submission.
 * Result is inserted as a shadow_reviews row with is_ai_review=true, reviewer_id=NULL.
 *
 * @param {{ title, content, language_tag, question }} submission
 * @returns {{ what_good, what_improve, resources, helpfulness_rating }}|null
 */
async function generateAIReview(submission) {
  const prompt = `You are an expert code reviewer. Review the following code submission and provide structured feedback.

Title: ${submission.title}
Language: ${submission.language_tag}
Author's question: ${submission.question}

Code:
${submission.content.slice(0, 6000)}

Return ONLY a JSON object with this exact shape:
{
  "what_good": "Detailed feedback on what was done well (2-4 sentences)",
  "what_improve": "Specific, actionable suggestions for improvement (2-4 sentences)",
  "resources": "One or two relevant documentation links or articles (can be empty string)",
  "helpfulness_rating": 4
}
helpfulness_rating must be an integer between 1 and 5.
No prose, no markdown wrapper — only the JSON object.`;

  return callClaude(prompt, null);
}

module.exports = { suggestTags, anonymityCheck, generateRoadmap, suggestConnections, generateAIReview };
