/**
 * server/src/__tests__/leakSweep.test.js
 *
 * Phase 6 Task 3 — Exhaustive Identity Leak Sweep.
 *
 * Hits EVERY /api/shadow/* endpoint via HTTP with realistic data,
 * then deep-scans the full JSON response body for forbidden fields.
 *
 * A single failure here is a Rule 6 critical bug that caps the
 * entire readiness score at 60.
 *
 * Zero new dependencies — uses Node 18+ built-in fetch + node:test.
 */

'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const {
  startTestServer,
  stopTestServer,
  resetDatabase,
  getBaseUrl,
  authHeader,
  jsonHeaders,
  makeUser,
  makeUserWithAnon,
  makeSubmission,
  query,
} = require('./setup');

// ── Test identity data ───────────────────────────────────────────────────
// These REAL-identity strings must NEVER appear in any shadow response.
const USERS = {
  A: { name: 'Alice Realname',  email: 'alice-real@leaktest.com',  adjective: 'Silent',  animal: 'Fox',    number: 11 },
  B: { name: 'Bob Testuser',    email: 'bob-real@leaktest.com',    adjective: 'Quiet',   animal: 'Wolf',   number: 22 },
  C: { name: 'Carol Checker',   email: 'carol-real@leaktest.com',  adjective: 'Rapid',   animal: 'Heron',  number: 33 },
};

// Keys that must NEVER appear as JSON keys in shadow responses
const FORBIDDEN_KEYS = [
  'name', 'email', 'password_hash', 'avatar_url', 'bio',
  'github_url', 'twitter_url',
];

// Keys that should NEVER appear in shadow response bodies
const DANGEROUS_KEYS = ['user_id', 'reviewer_id'];

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Deep-scan a JSON response body for identity leaks.
 * Checks forbidden JSON keys, dangerous keys, and literal identity strings.
 */
function assertNoLeak(responseBody, endpointLabel) {
  const json = JSON.stringify(responseBody);

  // 1. Forbidden JSON keys (surrounded by quotes + colon = JSON key)
  for (const key of FORBIDDEN_KEYS) {
    // Match "key": pattern (JSON key)
    const pattern = `"${key}":`;
    assert.ok(
      !json.includes(pattern),
      `IDENTITY LEAK — forbidden key "${key}" found in ${endpointLabel}`
    );
  }

  // 2. Dangerous keys that should never be response-level
  for (const key of DANGEROUS_KEYS) {
    const pattern = `"${key}":`;
    assert.ok(
      !json.includes(pattern),
      `IDENTITY LEAK — dangerous key "${key}" found in ${endpointLabel}`
    );
  }

  // 3. Literal real-identity strings
  for (const user of Object.values(USERS)) {
    assert.ok(
      !json.toLowerCase().includes(user.name.toLowerCase()),
      `IDENTITY LEAK — real name "${user.name}" found in ${endpointLabel}`
    );
    assert.ok(
      !json.toLowerCase().includes(user.email.toLowerCase()),
      `IDENTITY LEAK — real email "${user.email}" found in ${endpointLabel}`
    );
  }
}

// ── Test state ───────────────────────────────────────────────────────────

let userA, userB, userC;
let submission, review;

// ── Setup & Teardown ─────────────────────────────────────────────────────

before(async () => {
  await startTestServer();
  await resetDatabase();

  // Create 3 users with distinctive real names and anonymous identities
  userA = await makeUserWithAnon({ ...USERS.A });
  userB = await makeUserWithAnon({ ...USERS.B });
  userC = await makeUserWithAnon({ ...USERS.C });

  // A submits code
  submission = await makeSubmission(userA.accessToken, {
    title: 'Binary Search Implementation',
    content: 'function binarySearch(arr, target) {\n  let lo = 0, hi = arr.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >>> 1;\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return -1;\n}',
    language_tag: 'javascript',
    question: 'Is this approach correct?',
  });

  // B reviews A's submission
  const reviewRes = await fetch(`${getBaseUrl()}/api/shadow/submissions/${submission.id}/reviews`, {
    method: 'POST',
    headers: jsonHeaders(userB.accessToken),
    body: JSON.stringify({
      what_good: 'Clean implementation of binary search.',
      what_improve: 'Consider adding input validation.',
      resources: 'https://example.com/binary-search',
      helpfulness_rating: 4,
    }),
  });
  review = await reviewRes.json();

  // C votes B's review as helpful
  await fetch(`${getBaseUrl()}/api/shadow/reviews/${review.id}/helpful`, {
    method: 'POST',
    headers: jsonHeaders(userC.accessToken),
  });

  // A creates a shadow community post
  await fetch(`${getBaseUrl()}/api/shadow/community`, {
    method: 'POST',
    headers: jsonHeaders(userA.accessToken),
    body: JSON.stringify({ content: 'What do you think about async/await patterns?' }),
  });
});

after(async () => {
  await stopTestServer();
});

// ── Leak Sweep Tests ─────────────────────────────────────────────────────

describe('LEAK SWEEP — Shadow submission create response', () => {
  it('POST /api/shadow/submissions — no identity leak in creation response', () => {
    assertNoLeak(submission, 'POST /api/shadow/submissions');
  });
});

describe('LEAK SWEEP — Shadow queue', () => {
  it('GET /api/shadow/queue — no identity leak', async () => {
    const res = await fetch(`${getBaseUrl()}/api/shadow/queue`, {
      headers: authHeader(userB.accessToken),
    });
    const body = await res.json();
    assertNoLeak(body, 'GET /api/shadow/queue');
  });
});

describe('LEAK SWEEP — My submissions', () => {
  it('GET /api/shadow/submissions/mine — no identity leak', async () => {
    const res = await fetch(`${getBaseUrl()}/api/shadow/submissions/mine`, {
      headers: authHeader(userA.accessToken),
    });
    const body = await res.json();
    assertNoLeak(body, 'GET /api/shadow/submissions/mine');
  });
});

describe('LEAK SWEEP — Submission detail (owner view)', () => {
  it('GET /api/shadow/submissions/:id (owner) — no identity leak', async () => {
    const res = await fetch(`${getBaseUrl()}/api/shadow/submissions/${submission.id}`, {
      headers: authHeader(userA.accessToken),
    });
    const body = await res.json();
    assertNoLeak(body, 'GET /api/shadow/submissions/:id (owner)');
  });
});

describe('LEAK SWEEP — Submission detail (non-owner view)', () => {
  it('GET /api/shadow/submissions/:id (non-owner) — no identity leak', async () => {
    const res = await fetch(`${getBaseUrl()}/api/shadow/submissions/${submission.id}`, {
      headers: authHeader(userC.accessToken),
    });
    const body = await res.json();
    assertNoLeak(body, 'GET /api/shadow/submissions/:id (non-owner)');
  });
});

describe('LEAK SWEEP — Review create response', () => {
  it('POST /api/shadow/submissions/:id/reviews — no identity leak in creation response', () => {
    assertNoLeak(review, 'POST /api/shadow/submissions/:id/reviews');
  });
});

describe('LEAK SWEEP — Vote response', () => {
  it('POST /api/shadow/reviews/:id/helpful — no identity leak in vote response', async () => {
    // Use userA to vote (userC already voted)
    const res = await fetch(`${getBaseUrl()}/api/shadow/reviews/${review.id}/helpful`, {
      method: 'POST',
      headers: jsonHeaders(userA.accessToken),
    });
    const body = await res.json();
    assertNoLeak(body, 'POST /api/shadow/reviews/:id/helpful');
  });
});

describe('LEAK SWEEP — Shadow profile', () => {
  it('GET /api/shadow/me — no identity leak', async () => {
    const res = await fetch(`${getBaseUrl()}/api/shadow/me`, {
      headers: authHeader(userA.accessToken),
    });
    const body = await res.json();
    assertNoLeak(body, 'GET /api/shadow/me');
  });
});

describe('LEAK SWEEP — Shadow community listing', () => {
  it('GET /api/shadow/community — no identity leak', async () => {
    const res = await fetch(`${getBaseUrl()}/api/shadow/community`, {
      headers: authHeader(userB.accessToken),
    });
    const body = await res.json();
    assertNoLeak(body, 'GET /api/shadow/community');
  });
});

describe('LEAK SWEEP — Shadow community post creation', () => {
  it('POST /api/shadow/community — no identity leak in creation response', async () => {
    const res = await fetch(`${getBaseUrl()}/api/shadow/community`, {
      method: 'POST',
      headers: jsonHeaders(userB.accessToken),
      body: JSON.stringify({ content: 'Testing anonymous community post.' }),
    });
    const body = await res.json();
    assertNoLeak(body, 'POST /api/shadow/community');
  });
});

describe('LEAK SWEEP — Shadow notifications', () => {
  it('GET /api/notifications?context=shadow — no identity leak', async () => {
    const res = await fetch(`${getBaseUrl()}/api/notifications?context=shadow`, {
      headers: authHeader(userA.accessToken),
    });
    const body = await res.json();
    assertNoLeak(body, 'GET /api/notifications?context=shadow');
  });
});

// ── Meta checks ──────────────────────────────────────────────────────────

describe('LEAK SWEEP — Meta: shadowSerializer allowlist', () => {
  it('shadowSerializer only exports safe fields', () => {
    const { serializeShadowUser } = require('../utils/shadowSerializer');

    // Test with a row that has everything
    const dangerousRow = {
      id: 1,
      anonymous_username: 'silent_fox42',
      anonymous_avatar_url: 'https://safe.com/anon.png',
      anonymous_reputation_score: 5,
      has_anonymous_identity: true,
      created_at: new Date(),
      // These must be STRIPPED:
      user_id: 999,
      name: 'Secret Name',
      email: 'secret@evil.com',
      password_hash: '$2a$12$fakehash',
      avatar_url: 'http://evil.com/face.jpg',
      bio: 'I am a person',
      github_url: 'https://github.com/secret',
      twitter_url: 'https://twitter.com/secret',
    };

    const safe = serializeShadowUser(dangerousRow);
    const safeJson = JSON.stringify(safe);

    for (const key of FORBIDDEN_KEYS) {
      assert.ok(!safeJson.includes(`"${key}"`), `shadowSerializer leaked "${key}"`);
    }
    assert.ok(!safeJson.includes('"user_id"'), 'shadowSerializer leaked "user_id"');
    assert.ok(!safeJson.includes('Secret Name'), 'shadowSerializer leaked name value');
    assert.ok(!safeJson.includes('secret@evil.com'), 'shadowSerializer leaked email value');
  });
});
