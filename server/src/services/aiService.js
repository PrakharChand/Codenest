/**
 * server/src/services/aiService.js
 *
 * Senior-level Google Gemini AI Service layer for CodeNest.
 *
 * Production Features:
 *  1. Configurable GEMINI_MODEL with dynamic 404 fallback chain (gemini-2.5-flash, gemini-2.0-flash, gemini-flash-latest).
 *  2. Selective response caching for stable endpoints (tags, roadmaps).
 *  3. Strengthened schema validation & sanitization.
 *  4. Structured non-null fallback objects.
 *  5. Transient-only retry logic with exponential backoff.
 *  6. Guaranteed AbortController & timer cleanup.
 *  7. Render-structured JSON diagnostics including API key prefix, model, and execution metrics.
 */

const crypto = require('crypto');
const env = require('../config/env');
const { genAI, GEMINI_MODEL, FALLBACK_MODELS } = require('../config/gemini');
const aiPrompts = require('./aiPrompts');

// ── In-Memory Selective Response Cache ─────────────────────────────────────
const aiCache = new Map();

function getCacheKey(feature, payload) {
  const hash = crypto.createHash('md5').update(JSON.stringify(payload)).digest('hex');
  return `${feature}:${hash}`;
}

function getCachedResponse(cacheKey) {
  const cached = aiCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > env.AI_CACHE_TTL_MS) {
    aiCache.delete(cacheKey);
    return null;
  }
  return cached.data;
}

function setCachedResponse(cacheKey, data) {
  aiCache.set(cacheKey, { data, timestamp: Date.now() });
  if (aiCache.size > 500) {
    const oldestKey = aiCache.keys().next().value;
    aiCache.delete(oldestKey);
  }
}

// ── Transient Error Classifier ──────────────────────────────────────────────

function isTransientError(err) {
  if (!err) return false;
  if (err.name === 'AbortError') return true;

  const message = (err.message || '').toLowerCase();
  const status = err.status || err.statusCode;

  if (status === 429 || (status >= 500 && status <= 599)) return true;

  if (
    message.includes('fetch failed') ||
    message.includes('enotfound') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('quota') ||
    message.includes('resource_exhausted') ||
    message.includes('service unavailable')
  ) {
    return true;
  }

  return false;
}

// ── Response Validators & Sanitizers ──────────────────────────────────────

function validateAndSanitizeTags(data) {
  if (!data) return null;

  let rawTags = [];
  if (Array.isArray(data.tags)) {
    rawTags = data.tags;
  } else if (typeof data.tags === 'string') {
    rawTags = data.tags.split(',');
  } else if (Array.isArray(data.tag)) {
    rawTags = data.tag;
  } else if (typeof data.tag === 'string') {
    rawTags = data.tag.split(',');
  } else {
    return null;
  }

  const cleaned = Array.from(
    new Set(
      rawTags
        .filter((t) => typeof t === 'string' || typeof t === 'number')
        .map((t) => String(t).trim().toLowerCase().replace(/^#/, ''))
        .filter((t) => t.length > 0)
    )
  );

  if (cleaned.length < 1) return null;
  return { tags: cleaned.slice(0, 6) };
}

function validateAndSanitizeAnonymity(data) {
  if (!data || typeof data.safe !== 'boolean' || !Array.isArray(data.findings)) return null;

  const validFindings = data.findings
    .filter((f) => f && typeof f === 'object')
    .map((f) => ({
      type: String(f.type || 'unknown'),
      value: String(f.value || ''),
      suggestion: String(f.suggestion || ''),
    }));

  return {
    safe: validFindings.length === 0,
    findings: validFindings,
  };
}

function validateAndSanitizeRoadmap(data) {
  if (!data || !Array.isArray(data.phases) || data.phases.length === 0) return null;
  if (typeof data.total_weeks !== 'number' || data.total_weeks <= 0) return null;
  if (typeof data.summary !== 'string' || !data.summary.trim()) return null;

  return {
    phases: data.phases,
    total_weeks: data.total_weeks,
    summary: data.summary.trim(),
  };
}

function validateAndSanitizeConnections(data) {
  if (!data || !Array.isArray(data.suggestions)) return null;

  const validSuggestions = data.suggestions
    .filter((s) => s && (typeof s.user_id === 'number' || !isNaN(parseInt(s.user_id, 10))))
    .map((s) => ({
      user_id: parseInt(s.user_id, 10),
      reason: String(s.reason || 'Recommended connection based on matching developer topics.').trim(),
    }));

  return { suggestions: validSuggestions };
}

function validateAndSanitizeReview(data) {
  if (!data) return null;
  if (typeof data.what_good !== 'string' || !data.what_good.trim()) return null;
  if (typeof data.what_improve !== 'string' || !data.what_improve.trim()) return null;

  const rating = parseInt(data.helpfulness_rating, 10);
  const validRating = !isNaN(rating) && rating >= 1 && rating <= 5 ? rating : 3;

  return {
    what_good: data.what_good.trim(),
    what_improve: data.what_improve.trim(),
    resources: typeof data.resources === 'string' ? data.resources.trim() : '',
    helpfulness_rating: validRating,
  };
}

// ── Core Gemini Call Execution Engine ─────────────────────────────────────

/**
 * Standardized Gemini API runner with transient retries, 404 model fallback,
 * timeout management, schema validation, and structured error logging.
 */
async function callGeminiWithRetry(featureName, prompt, fallback, validatorFn, meta = {}) {
  const startTime = Date.now();
  let lastError = null;
  const apiKeyPrefix = env.GEMINI_API_KEY ? `${env.GEMINI_API_KEY.slice(0, 8)}...` : 'MISSING';

  for (const modelName of FALLBACK_MODELS) {
    for (let attempt = 1; attempt <= env.AI_MAX_RETRIES + 1; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 4096,
            temperature: 0.2,
          },
        });

        const result = await model.generateContent(prompt, { signal: controller.signal });
        clearTimeout(timer);

        const responseText = result.response.text();
        const cleanedText = responseText
          .replace(/^```(?:json)?\n?/, '')
          .replace(/\n?```$/, '')
          .trim();

        let parsed = null;
        try {
          parsed = JSON.parse(cleanedText);
        } catch (parseErr) {
          try {
            const patched = cleanedText
              .replace(/,\s*([\]}])/g, '$1')
              .replace(/}\s*[^}]*$/, '}');
            parsed = JSON.parse(patched);
          } catch (_) {
            throw parseErr;
          }
        }
        const validated = validatorFn ? validatorFn(parsed) : parsed;

        if (!validated) {
          lastError = new Error('AI output failed schema validation');
          console.warn(
            JSON.stringify({
              level: 'WARN',
              service: 'aiService',
              feature: featureName,
              model: modelName,
              attempt,
              userId: meta.userId || null,
              apiKeyPrefix,
              event: 'SCHEMA_VALIDATION_FAILED',
            })
          );
        } else {
          const duration_ms = Date.now() - startTime;
          console.log(
            JSON.stringify({
              level: 'INFO',
              service: 'aiService',
              feature: featureName,
              model: modelName,
              duration_ms,
              attempt,
              cached: false,
              userId: meta.userId || null,
              apiKeyPrefix,
              event: 'SUCCESS',
            })
          );
          return validated;
        }
      } catch (err) {
        clearTimeout(timer);
        lastError = err;

        const is404 =
          err.status === 404 ||
          (err.message && err.message.includes('404')) ||
          (err.message && err.message.includes('not found')) ||
          (err.message && err.message.includes('no longer available'));

        if (is404) {
          console.warn(
            JSON.stringify({
              level: 'WARN',
              service: 'aiService',
              feature: featureName,
              model: modelName,
              apiKeyPrefix,
              error: err.message,
              event: 'MODEL_404_SWITCHING_FALLBACK',
            })
          );
          break; // Break attempt loop to switch to next fallback model immediately
        }

        const isTransient = isTransientError(err);
        console.warn(
          JSON.stringify({
            level: 'WARN',
            service: 'aiService',
            feature: featureName,
            model: modelName,
            attempt,
            maxAttempts: env.AI_MAX_RETRIES + 1,
            transient: isTransient,
            userId: meta.userId || null,
            apiKeyPrefix,
            error: err.name === 'AbortError' ? 'Timeout' : err.message,
            event: 'ATTEMPT_FAILED',
          })
        );

        if (!isTransient || attempt > env.AI_MAX_RETRIES) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
      }
    }
  }

  const duration_ms = Date.now() - startTime;
  console.error(
    JSON.stringify({
      level: 'ERROR',
      service: 'aiService',
      feature: featureName,
      duration_ms,
      userId: meta.userId || null,
      apiKeyPrefix,
      error: lastError?.message || 'All models failed',
      event: 'FALLBACK_TRIGGERED',
    })
  );

  return fallback;
}

// ── 1. suggestTags ────────────────────────────────────────────────────────
async function suggestTags(content, userId = null) {
  const fallback = { tags: [], fallback: true };
  if (!content || typeof content !== 'string') return fallback;

  const cacheKey = getCacheKey('suggestTags', content.slice(0, 500));
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    console.log(
      JSON.stringify({
        level: 'INFO',
        service: 'aiService',
        feature: 'suggestTags',
        model: GEMINI_MODEL,
        cached: true,
        userId,
        event: 'CACHE_HIT',
      })
    );
    return { ...cached, fallback: false };
  }

  const prompt = aiPrompts.suggestTags(content);
  const result = await callGeminiWithRetry('suggestTags', prompt, fallback, validateAndSanitizeTags, { userId });

  if (result && !result.fallback) {
    setCachedResponse(cacheKey, result);
  }
  return result;
}

// ── 2. anonymityCheck ─────────────────────────────────────────────────────
async function anonymityCheck(text, userId = null) {
  const fallback = { safe: true, findings: [], fallback: true };
  if (!text || typeof text !== 'string') return fallback;

  const prompt = aiPrompts.anonymityCheck(text);
  return callGeminiWithRetry('anonymityCheck', prompt, fallback, validateAndSanitizeAnonymity, { userId });
}

// ── 3. generateRoadmap ────────────────────────────────────────────────────
async function generateRoadmap(profile, userId = null) {
  const fallback = { phases: [], total_weeks: 0, summary: '', fallback: true };
  if (!profile) return fallback;

  const cacheKey = getCacheKey('generateRoadmap', profile);
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    console.log(
      JSON.stringify({
        level: 'INFO',
        service: 'aiService',
        feature: 'generateRoadmap',
        model: GEMINI_MODEL,
        cached: true,
        userId,
        event: 'CACHE_HIT',
      })
    );
    return { ...cached, fallback: false };
  }

  const prompt = aiPrompts.generateRoadmap(profile);
  const result = await callGeminiWithRetry('generateRoadmap', prompt, fallback, validateAndSanitizeRoadmap, { userId });

  if (result && !result.fallback) {
    setCachedResponse(cacheKey, result);
  }
  return result;
}

// ── 4. suggestConnections ─────────────────────────────────────────────────
async function suggestConnections(myPosts, candidates, userId = null) {
  const fallback = { suggestions: [], fallback: true };
  if (!candidates || !candidates.length) return fallback;

  const myTopics = myPosts.map((p) => p.title).join(', ') || 'various topics';
  const candidatesText = candidates
    .slice(0, 20)
    .map((c) => `user_id:${c.user_id}, posts: ${c.titles}`)
    .join('\n');

  const prompt = aiPrompts.suggestConnections(myTopics, candidatesText);
  return callGeminiWithRetry('suggestConnections', prompt, fallback, validateAndSanitizeConnections, { userId });
}

// ── 5. generateAIReview ───────────────────────────────────────────────────
async function generateAIReview(submission) {
  const fallback = {
    what_good: '',
    what_improve: '',
    resources: '',
    helpfulness_rating: 0,
    fallback: true,
  };
  if (!submission) return fallback;

  const prompt = aiPrompts.generateAIReview(submission);
  return callGeminiWithRetry('generateAIReview', prompt, fallback, validateAndSanitizeReview, { userId: null });
}

module.exports = {
  suggestTags,
  anonymityCheck,
  generateRoadmap,
  suggestConnections,
  generateAIReview,
};
