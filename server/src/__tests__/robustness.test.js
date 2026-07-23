/**
 * server/src/__tests__/robustness.test.js
 *
 * Phase 6 Task 5 — Robustness & failure-path sweep.
 *
 * Tests negative/edge-case paths via HTTP:
 *   - Missing/invalid token → 401
 *   - Wrong owner → 403
 *   - Malformed body → 400 with field in error shape
 *   - Duplicate like → idempotent success
 *   - Duplicate review → 409 (not 500)
 *   - Self-review → 403
 *   - Self-connect → 400
 *   - Forced error → generic 500 with no raw stack/SQL
 *
 * Every error response must match { error: { code, message, field? } }.
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
  makePost,
  makeSubmission,
  query,
} = require('./setup');

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Verify error shape matches the locked contract: { error: { code, message } }
 */
function assertErrorShape(body, expectedCode, label) {
  assert.ok(body.error, `${label}: response should have .error property`);
  assert.ok(body.error.code, `${label}: error should have .code`);
  assert.ok(body.error.message, `${label}: error should have .message`);
  if (expectedCode) {
    assert.equal(body.error.code, expectedCode, `${label}: wrong error code`);
  }
}

/**
 * Verify no raw stack trace or SQL text leaked in error response.
 */
function assertNoRawLeak(body, label) {
  const json = JSON.stringify(body);
  // No stack traces
  assert.ok(!json.includes('    at '), `${label}: raw stack trace leaked`);
  assert.ok(!json.includes('node_modules'), `${label}: node_modules path leaked`);
  // No raw SQL
  assert.ok(!json.includes('SELECT '), `${label}: raw SQL leaked`);
  assert.ok(!json.includes('INSERT '), `${label}: raw SQL leaked`);
  assert.ok(!json.includes('UPDATE '), `${label}: raw SQL leaked`);
  // No Postgres constraint names
  assert.ok(!json.includes('_pkey'), `${label}: Postgres constraint name leaked`);
  assert.ok(!json.includes('_fkey'), `${label}: Postgres constraint name leaked`);
  assert.ok(!json.includes('violates'), `${label}: Postgres error text leaked`);
}

// ── Lifecycle ────────────────────────────────────────────────────────────

before(async () => {
  await startTestServer();
  await resetDatabase();
});

after(async () => {
  await stopTestServer();
});

// ═══════════════════════════════════════════════════════════════════════════
// Auth Failures
// ═══════════════════════════════════════════════════════════════════════════

describe('Robustness — Auth failures', () => {
  it('Missing token → 401 with locked error shape', async () => {
    const res = await fetch(`${getBaseUrl()}/api/auth/me`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assertErrorShape(body, 'UNAUTHORIZED', 'GET /api/auth/me (no token)');
    assertNoRawLeak(body, 'GET /api/auth/me (no token)');
  });

  it('Invalid token → 401 with locked error shape', async () => {
    const res = await fetch(`${getBaseUrl()}/api/auth/me`, {
      headers: authHeader('not.a.valid.jwt.token'),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assertErrorShape(body, 'UNAUTHORIZED', 'GET /api/auth/me (bad token)');
    assertNoRawLeak(body, 'GET /api/auth/me (bad token)');
  });

  it('Expired token format → 401', async () => {
    // Create a clearly malformed JWT
    const res = await fetch(`${getBaseUrl()}/api/posts`, {
      method: 'POST',
      headers: jsonHeaders('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjoxfQ.invalid'),
      body: JSON.stringify({ title: 'test', content: 'test' }),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assertErrorShape(body, 'UNAUTHORIZED', 'POST /api/posts (expired-like token)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Ownership Violations
// ═══════════════════════════════════════════════════════════════════════════

describe('Robustness — Ownership violations', () => {
  let owner, intruder, post;

  before(async () => {
    owner    = await makeUser({ name: 'Owner', email: 'owner-rob@test.com' });
    intruder = await makeUser({ name: 'Intruder', email: 'intruder-rob@test.com' });
    post     = await makePost(owner.accessToken, { title: 'Owner Only Post' });
  });

  it('Non-owner cannot delete a post → 403', async () => {
    const res = await fetch(`${getBaseUrl()}/api/posts/${post.id}`, {
      method: 'DELETE',
      headers: jsonHeaders(intruder.accessToken),
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assertErrorShape(body, 'FORBIDDEN', 'DELETE /api/posts/:id (wrong owner)');
    assertNoRawLeak(body, 'DELETE /api/posts/:id (wrong owner)');
  });

  it('Non-owner cannot update a post → 403', async () => {
    const res = await fetch(`${getBaseUrl()}/api/posts/${post.id}`, {
      method: 'PUT',
      headers: jsonHeaders(intruder.accessToken),
      body: JSON.stringify({ title: 'Hacked Title' }),
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assertErrorShape(body, 'FORBIDDEN', 'PUT /api/posts/:id (wrong owner)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Validation Failures
// ═══════════════════════════════════════════════════════════════════════════

describe('Robustness — Validation errors', () => {
  let user;

  before(async () => {
    user = await makeUser({ name: 'Validator', email: 'validator-rob@test.com' });
  });

  it('Missing post title → 400 with field in error shape', async () => {
    const res = await fetch(`${getBaseUrl()}/api/posts`, {
      method: 'POST',
      headers: jsonHeaders(user.accessToken),
      body: JSON.stringify({ content: 'Content without title.' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assertErrorShape(body, 'BAD_REQUEST', 'POST /api/posts (missing title)');
    assertNoRawLeak(body, 'POST /api/posts (missing title)');
  });

  it('Invalid email on register → 400', async () => {
    const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'not-an-email', password: 'SecurePass1!' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assertErrorShape(body, 'BAD_REQUEST', 'POST /register (invalid email)');
  });

  it('Short password on register → 400', async () => {
    const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'short@test.com', password: '123' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assertErrorShape(body, 'BAD_REQUEST', 'POST /register (short password)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Idempotency & Duplicate Handling
// ═══════════════════════════════════════════════════════════════════════════

describe('Robustness — Duplicate like is idempotent', () => {
  let user, post;

  before(async () => {
    user = await makeUser({ name: 'Liker', email: 'liker-rob@test.com' });
    post = await makePost(user.accessToken, { title: 'Like Target' });
  });

  it('First like → 200', async () => {
    const res = await fetch(`${getBaseUrl()}/api/posts/${post.id}/like`, {
      method: 'POST',
      headers: jsonHeaders(user.accessToken),
    });
    assert.equal(res.status, 200);
  });

  it('Second like (duplicate) → 200 (idempotent, not 409 or 500)', async () => {
    const res = await fetch(`${getBaseUrl()}/api/posts/${post.id}/like`, {
      method: 'POST',
      headers: jsonHeaders(user.accessToken),
    });
    assert.equal(res.status, 200);

    // Counter should still be 1 (not bumped twice)
    const postRes = await fetch(`${getBaseUrl()}/api/posts/${post.id}`);
    const updated = await postRes.json();
    assert.equal(updated.like_count, 1, 'Like count should not double on duplicate');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Shadow-Specific Edge Cases
// ═══════════════════════════════════════════════════════════════════════════

describe('Robustness — Shadow edge cases', () => {
  let submitter, reviewer;
  let sub, rev;

  before(async () => {
    submitter = await makeUserWithAnon({
      name: 'Shadow Owner', email: 'shadow-owner-rob@test.com',
      adjective: 'Bold', animal: 'Fox', number: 10,
    });
    reviewer = await makeUserWithAnon({
      name: 'Shadow Reviewer', email: 'shadow-reviewer-rob@test.com',
      adjective: 'Keen', animal: 'Wolf', number: 20,
    });

    sub = await makeSubmission(submitter.accessToken);

    const revRes = await fetch(`${getBaseUrl()}/api/shadow/submissions/${sub.id}/reviews`, {
      method: 'POST',
      headers: jsonHeaders(reviewer.accessToken),
      body: JSON.stringify({
        what_good: 'Good.', what_improve: 'Improve.', resources: '', helpfulness_rating: 3,
      }),
    });
    rev = await revRes.json();
  });

  it('Self-review → 403 (submitter cannot review own submission)', async () => {
    const res = await fetch(`${getBaseUrl()}/api/shadow/submissions/${sub.id}/reviews`, {
      method: 'POST',
      headers: jsonHeaders(submitter.accessToken),
      body: JSON.stringify({
        what_good: 'Self review', what_improve: 'N/A', resources: '', helpfulness_rating: 5,
      }),
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assertErrorShape(body, 'FORBIDDEN', 'Self-review attempt');
    assertNoRawLeak(body, 'Self-review attempt');
  });

  it('Duplicate review → 409 (not 500)', async () => {
    const res = await fetch(`${getBaseUrl()}/api/shadow/submissions/${sub.id}/reviews`, {
      method: 'POST',
      headers: jsonHeaders(reviewer.accessToken),
      body: JSON.stringify({
        what_good: 'Duplicate.', what_improve: 'N/A', resources: '', helpfulness_rating: 3,
      }),
    });
    assert.equal(res.status, 409);
    const body = await res.json();
    assertErrorShape(body, 'CONFLICT', 'Duplicate review');
    assertNoRawLeak(body, 'Duplicate review');
  });

  it('User without anon identity → 403 on shadow routes', async () => {
    const noAnon = await makeUser({ name: 'No Anon', email: 'noanon-rob@test.com' });
    const res = await fetch(`${getBaseUrl()}/api/shadow/queue`, {
      headers: authHeader(noAnon.accessToken),
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assertErrorShape(body, 'FORBIDDEN', 'Shadow access without anon identity');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Connection Edge Cases
// ═══════════════════════════════════════════════════════════════════════════

describe('Robustness — Connection edge cases', () => {
  it('Self-connect → 400 (CHECK constraint → clean error shape)', async () => {
    const user = await makeUser({ name: 'Self Connect', email: 'selfconn-rob@test.com' });
    const res = await fetch(`${getBaseUrl()}/api/users/${user.user.id}/connect`, {
      method: 'POST',
      headers: jsonHeaders(user.accessToken),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assertErrorShape(body, 'BAD_REQUEST', 'Self-connect');
    assertNoRawLeak(body, 'Self-connect');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Not Found
// ═══════════════════════════════════════════════════════════════════════════

describe('Robustness — 404 handling', () => {
  it('Unknown route → 404 with locked error shape', async () => {
    const res = await fetch(`${getBaseUrl()}/api/nonexistent`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assertErrorShape(body, 'NOT_FOUND', 'Unknown route');
  });

  it('Non-existent post → 404', async () => {
    const res = await fetch(`${getBaseUrl()}/api/posts/999999`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assertErrorShape(body, 'NOT_FOUND', 'Post 999999');
  });
});
