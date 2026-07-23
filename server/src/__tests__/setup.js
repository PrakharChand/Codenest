/**
 * server/src/__tests__/setup.js
 *
 * Phase 6 — Test infrastructure.
 *
 * Provides:
 *   - startTestServer()  — boots Express on a random port, returns baseUrl
 *   - stopTestServer()   — closes HTTP server + DB pool
 *   - resetDatabase()    — truncates all data tables, re-seeds lookups
 *   - authHeader(token)  — returns { Authorization: 'Bearer <token>' } object
 *   - Factory helpers: makeUser, makeUserWithAnon, makePost, makeSubmission
 *
 * Convention: all factories use HTTP calls (not direct DB inserts) so the full
 * middleware chain is exercised even during fixture setup.
 *
 * Dependencies: ZERO new packages — uses Node 18+ built-in fetch + node:test.
 */

'use strict';

const path = require('path');
const http = require('http');

// ── 1. Load .env BEFORE any app import ─────────────────────────────────────

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Force test mode — overrides .env if it sets NODE_ENV=development
process.env.NODE_ENV = 'test';

// Defaults for required vars (belt-and-suspenders if .env is incomplete)
if (!process.env.JWT_ACCESS_SECRET)  process.env.JWT_ACCESS_SECRET  = 'test-access-secret-at-least-32-chars-long-abc';
if (!process.env.JWT_REFRESH_SECRET) process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-different-from-access-xyz';
if (!process.env.CLIENT_URL)         process.env.CLIENT_URL         = 'http://localhost:5173';
if (!process.env.PORT)               process.env.PORT               = '0';

// Defaults for optional vars so passport/cloudinary/anthropic boot cleanly
if (!process.env.GITHUB_CLIENT_ID)      process.env.GITHUB_CLIENT_ID      = 'test-github-id';
if (!process.env.GITHUB_CLIENT_SECRET)  process.env.GITHUB_CLIENT_SECRET  = 'test-github-secret';
if (!process.env.GITHUB_CALLBACK_URL)   process.env.GITHUB_CALLBACK_URL   = 'http://localhost:5000/api/auth/github/callback';
if (!process.env.GOOGLE_CLIENT_ID)      process.env.GOOGLE_CLIENT_ID      = 'test-google-id';
if (!process.env.GOOGLE_CLIENT_SECRET)  process.env.GOOGLE_CLIENT_SECRET  = 'test-google-secret';
if (!process.env.GOOGLE_CALLBACK_URL)   process.env.GOOGLE_CALLBACK_URL   = 'http://localhost:5000/api/auth/google/callback';
if (!process.env.CLOUDINARY_CLOUD_NAME) process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
if (!process.env.CLOUDINARY_API_KEY)    process.env.CLOUDINARY_API_KEY    = 'test-key';
if (!process.env.CLOUDINARY_API_SECRET) process.env.CLOUDINARY_API_SECRET = 'test-secret';
if (!process.env.ANTHROPIC_API_KEY)     process.env.ANTHROPIC_API_KEY     = 'sk-ant-test-placeholder';

// ── 2. Import app modules (env.js validates at import time) ────────────────

const app                  = require('../app');
const { pool, query }      = require('../config/db');
const { signAccessToken }  = require('../utils/tokens');

// ── 3. Server lifecycle ────────────────────────────────────────────────────

let server;
let _baseUrl;

async function startTestServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer(app);
    server.on('error', reject);
    server.listen(0, () => {
      const port = server.address().port;
      _baseUrl = `http://localhost:${port}`;
      resolve(_baseUrl);
    });
  });
}

async function stopTestServer() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }
  await pool.end();
}

function getBaseUrl() {
  if (!_baseUrl) throw new Error('Test server not started. Call startTestServer() first.');
  return _baseUrl;
}

// ── 4. Database reset ──────────────────────────────────────────────────────

// Tables in reverse FK dependency order for safe truncation.
// CASCADE handles the rest, but ordering makes intent explicit.
const DATA_TABLES = [
  'shadow_helpful_votes',
  'shadow_reviews',
  'shadow_submissions',
  'shadow_community_posts',
  'user_roadmaps',
  'notifications',
  'post_tags',
  'community_posts',
  'community_members',
  'communities',
  'connections',
  'likes',
  'comments',
  'posts',
  'users',
  // Lookup tables (anon_adjectives, anon_animals, tags) are NOT truncated —
  // they are re-seeded with ON CONFLICT DO NOTHING below.
];

/**
 * Check if the database is reachable. Returns true if connected, false otherwise.
 * Call this in before() hooks to skip DB-dependent tests gracefully.
 */
async function checkDatabaseConnectivity() {
  try {
    await query('SELECT 1');
    return true;
  } catch (err) {
    console.warn(`[setup] Database unreachable: ${err.message}`);
    return false;
  }
}

async function resetDatabase() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('SAFETY: resetDatabase() refused — NODE_ENV is not "test".');
  }

  // Truncate all data tables in one statement for speed
  await query(`TRUNCATE TABLE ${DATA_TABLES.join(', ')} CASCADE`);

  // Re-seed a subset of lookup data (enough for tests)
  const adjectives = ['Silent', 'Quiet', 'Rapid', 'Clever', 'Calm', 'Swift', 'Bright', 'Steady', 'Bold', 'Keen'];
  const animals    = ['Fox', 'Wolf', 'Heron', 'Falcon', 'Otter', 'Lynx', 'Crane', 'Raven', 'Moose', 'Bison'];
  const tags       = ['react', 'javascript', 'python', 'node'];

  for (const w of adjectives) {
    await query('INSERT INTO anon_adjectives (word) VALUES ($1) ON CONFLICT DO NOTHING', [w]);
  }
  for (const w of animals) {
    await query('INSERT INTO anon_animals (word) VALUES ($1) ON CONFLICT DO NOTHING', [w]);
  }
  for (const t of tags) {
    await query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT DO NOTHING', [t]);
  }
}

// ── 5. Helpers ─────────────────────────────────────────────────────────────

function authHeader(token) {
  return { 'Authorization': `Bearer ${token}` };
}

function jsonHeaders(token) {
  return {
    'Content-Type': 'application/json',
    ...(token ? authHeader(token) : {}),
  };
}

// ── 6. Factory helpers ─────────────────────────────────────────────────────

let _userCounter = 0;

/**
 * Create a registered user via HTTP.
 * @returns {{ user, accessToken, email, password, name }}
 */
async function makeUser({ name, email, password = 'TestPass123!' } = {}) {
  _userCounter++;
  if (!name)  name  = `Test User ${_userCounter}`;
  if (!email) email = `testuser${_userCounter}-${Date.now()}@test.com`;

  const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`makeUser failed (${res.status}): ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return { user: data.user, accessToken: data.accessToken, email, password, name };
}

/**
 * Create a user + anonymous identity via HTTP.
 * @returns {{ user, accessToken, email, password, name, anonUsername }}
 */
async function makeUserWithAnon({
  name, email, password,
  adjective = 'Silent', animal = 'Fox',
  number = Math.floor(Math.random() * 90) + 1,
} = {}) {
  const result = await makeUser({ name, email, password });

  const anonRes = await fetch(`${getBaseUrl()}/api/auth/anonymous/create`, {
    method: 'POST',
    headers: jsonHeaders(result.accessToken),
    body: JSON.stringify({ adjective, animal, number }),
  });

  if (!anonRes.ok) {
    const err = await anonRes.json();
    throw new Error(`makeUserWithAnon failed (${anonRes.status}): ${JSON.stringify(err)}`);
  }

  // Refresh user data to get anonymous fields
  const meRes = await fetch(`${getBaseUrl()}/api/auth/me`, {
    headers: authHeader(result.accessToken),
  });
  const meData = await meRes.json();
  const anonUsername = `${adjective.toLowerCase()}_${animal.toLowerCase()}${number}`;

  return { ...result, user: meData.user, anonUsername };
}

/**
 * Create a post via HTTP.
 * @returns {object} post object from response
 */
async function makePost(accessToken, {
  title = 'Test Post',
  content = 'This is test content for a post that is long enough.',
  tags = [],
} = {}) {
  const res = await fetch(`${getBaseUrl()}/api/posts`, {
    method: 'POST',
    headers: jsonHeaders(accessToken),
    body: JSON.stringify({ title, content, tags }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`makePost failed (${res.status}): ${JSON.stringify(err)}`);
  }

  return res.json();
}

/**
 * Create a shadow submission via HTTP.
 * @returns {object} submission object from response
 */
async function makeSubmission(accessToken, {
  title = 'Test Submission',
  content = 'function test() { return 42; }',
  language_tag = 'javascript',
  question = 'Is this the right approach?',
} = {}) {
  const res = await fetch(`${getBaseUrl()}/api/shadow/submissions`, {
    method: 'POST',
    headers: jsonHeaders(accessToken),
    body: JSON.stringify({ title, content, language_tag, question }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`makeSubmission failed (${res.status}): ${JSON.stringify(err)}`);
  }

  return res.json();
}

// ── 7. Exports ─────────────────────────────────────────────────────────────

module.exports = {
  startTestServer,
  stopTestServer,
  resetDatabase,
  checkDatabaseConnectivity,
  getBaseUrl,
  authHeader,
  jsonHeaders,
  makeUser,
  makeUserWithAnon,
  makePost,
  makeSubmission,
  query,
  pool,
  signAccessToken,
};
