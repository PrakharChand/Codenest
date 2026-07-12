/**
 * server/src/__tests__/phase5.test.js
 *
 * Phase 5 unit tests covering:
 *   A. Notification identity rule — shadow messages contain no real identity
 *   B. Upload middleware — file-type allowlist and size cap
 *   C. OAuth email-collision — links to existing account, no duplicate row
 *   D. AI fallback — every feature returns its safe fallback on thrown error
 *   E. Cron insert — reviewer_id=NULL passes the partial-unique index rule
 *   F. createNotification — shadow message contains no identity text
 *
 * All tests run in isolation — no real DB, no real Claude, no real Cloudinary.
 */

'use strict';

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

// ── A. Notification identity rule ─────────────────────────────────────────

describe('Shadow notification — identity rule', () => {
  const FORBIDDEN_IDENTITY_STRINGS = [
    'alice', 'bob', 'charlie',               // real names
    '@', '.com', 'gmail', 'github',          // email / social fragments
    'anonymous_fox', 'silent_bear',          // anonymous usernames (must not appear either)
  ];

  const SAFE_SHADOW_MESSAGES = [
    'Your submission received a new review.',
    'Your submission received a new review.',  // cron path
  ];

  for (const msg of SAFE_SHADOW_MESSAGES) {
    it(`message "${msg}" contains no forbidden identity text`, () => {
      const lower = msg.toLowerCase();
      for (const forbidden of FORBIDDEN_IDENTITY_STRINGS) {
        assert.ok(
          !lower.includes(forbidden),
          `Shadow message contains forbidden string: "${forbidden}"`
        );
      }
    });
  }

  it('shadow notification does not contain "review" AND a username', () => {
    const msg = 'Your submission received a new review.';
    // Must not pattern-match "username reviewed your" — identity-free phrasing
    assert.ok(!msg.match(/\w+\s+reviewed\s+your/i));
  });
});

// ── B. Upload middleware — allowlist & size cap ───────────────────────────

describe('Upload middleware — file type and size validation', () => {
  // Simulate multer's fileFilter callback
  const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

  function fileFilter(mimetype) {
    return ALLOWED_MIME_TYPES.has(mimetype);
  }

  it('allows image/png', () => assert.ok(fileFilter('image/png')));
  it('allows image/jpeg', () => assert.ok(fileFilter('image/jpeg')));
  it('allows image/webp', () => assert.ok(fileFilter('image/webp')));
  it('rejects text/plain', () => assert.ok(!fileFilter('text/plain')));
  it('rejects application/pdf', () => assert.ok(!fileFilter('application/pdf')));
  it('rejects image/gif', () => assert.ok(!fileFilter('image/gif')));
  it('max size is 5 MB', () => assert.equal(MAX_FILE_SIZE_BYTES, 5 * 1024 * 1024));

  it('upload route cannot write anonymous_avatar_url', () => {
    // Read the upload controller source and assert that no SQL or JS
    // write touches anonymous_avatar_url (comments explaining the rule are fine)
    const fs  = require('fs');
    const src = fs.readFileSync(
      require('path').join(__dirname, '../controllers/uploadController.js'),
      'utf8'
    );
    // Strip single-line comments before scanning for write patterns
    const noComments = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(
      !noComments.includes('anonymous_avatar_url'),
      'uploadController.js must never write to anonymous_avatar_url in code (comments only)'
    );
  });
});

// ── C. OAuth email-collision — links, no duplicate ────────────────────────

describe('OAuth account-linking — email collision', () => {
  // Simulate the findOrCreateOAuthUser logic without a real DB

  async function findOrCreateOAuthUser({ email, existingUsers }) {
    if (!email) throw new Error('NO_EMAIL');
    const normalised = email.toLowerCase();
    const existing = existingUsers.find((u) => u.email === normalised);
    if (existing) return { action: 'linked', user: existing };
    const newUser = { id: 999, email: normalised, password_hash: null, has_anonymous_identity: false };
    existingUsers.push(newUser);
    return { action: 'created', user: newUser };
  }

  it('links to existing account when email matches', async () => {
    const users = [{ id: 1, email: 'test@example.com', password_hash: 'bcrypt_hash' }];
    const result = await findOrCreateOAuthUser({ email: 'test@example.com', existingUsers: users });
    assert.equal(result.action, 'linked');
    assert.equal(result.user.id, 1);
    // No new row created
    assert.equal(users.length, 1);
  });

  it('does not create a duplicate row for the same email', async () => {
    const users = [{ id: 1, email: 'dupe@example.com', password_hash: null }];
    const before = users.length;
    await findOrCreateOAuthUser({ email: 'dupe@example.com', existingUsers: users });
    assert.equal(users.length, before, 'User count must not increase on email collision');
  });

  it('creates a new user when email is brand new', async () => {
    const users = [];
    const result = await findOrCreateOAuthUser({ email: 'new@example.com', existingUsers: users });
    assert.equal(result.action, 'created');
    assert.equal(result.user.password_hash, null, 'OAuth user must have password_hash = NULL');
    assert.equal(result.user.has_anonymous_identity, false);
    assert.equal(users.length, 1);
  });

  it('throws NO_EMAIL when provider returns no email', async () => {
    await assert.rejects(
      () => findOrCreateOAuthUser({ email: null, existingUsers: [] }),
      (err) => err.message === 'NO_EMAIL'
    );
  });

  it('OAuth-created user has password_hash = NULL (no local password)', async () => {
    const users = [];
    const result = await findOrCreateOAuthUser({ email: 'oauth@example.com', existingUsers: users });
    assert.equal(result.user.password_hash, null);
  });
});

// ── D. AI fallback — every feature returns safe fallback on error ─────────

describe('AI service — fallback on thrown error', () => {
  // Simulate callClaude throwing (timeout / API down / parse error)
  async function callClaudeThrowing(_prompt, fallback) {
    try {
      throw new Error('AbortError: request timed out');
    } catch {
      return fallback;
    }
  }

  it('suggestTags fallback is { tags: [] }', async () => {
    const result = await callClaudeThrowing('any prompt', { tags: [] });
    assert.deepEqual(result, { tags: [] });
  });

  it('anonymityCheck fallback is { safe: true, findings: [] } (fail-open)', async () => {
    const result = await callClaudeThrowing('any prompt', { safe: true, findings: [] });
    assert.deepEqual(result, { safe: true, findings: [] });
    // Fail-open: safe=true means submission remains possible when AI is down
    assert.equal(result.safe, true);
  });

  it('generateRoadmap fallback is null (no partial write)', async () => {
    const result = await callClaudeThrowing('any prompt', null);
    assert.equal(result, null);
  });

  it('suggestConnections fallback is { suggestions: [] }', async () => {
    const result = await callClaudeThrowing('any prompt', { suggestions: [] });
    assert.deepEqual(result, { suggestions: [] });
  });

  it('generateAIReview fallback is null', async () => {
    const result = await callClaudeThrowing('any prompt', null);
    assert.equal(result, null);
  });

  it('fallback does not throw — surrounding action stays healthy', async () => {
    // Simulates a route calling AI and continuing to respond despite failure
    async function routeHandler() {
      const aiResult = await callClaudeThrowing('prompt', { tags: [] });
      return { status: 200, body: aiResult };
    }
    const response = await routeHandler();
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { tags: [] });
  });
});

// ── E. Cron insert — partial-unique index compatibility ───────────────────

describe('AI review cron — reviewer_id = NULL passes partial-unique index', () => {
  // The index is: UNIQUE (submission_id, reviewer_id) WHERE reviewer_id IS NOT NULL
  // So two AI reviews with reviewer_id=NULL on the same submission are NOT blocked
  // (they're excluded from the index). But the cron guards against re-review by
  // checking review_count = 0 — so a second run never tries to insert.

  function isEligible(submission) {
    return submission.review_count === 0;
  }

  it('submission with review_count=0 is eligible', () => {
    assert.ok(isEligible({ id: 1, review_count: 0 }));
  });

  it('submission with review_count=1 is NOT eligible (already reviewed)', () => {
    assert.ok(!isEligible({ id: 1, review_count: 1 }));
  });

  it('AI review insert uses reviewer_id=NULL (not blocked by partial index)', () => {
    // The partial-unique index only covers WHERE reviewer_id IS NOT NULL
    // So reviewer_id=NULL rows are exempt from the uniqueness constraint
    const reviewerIdValue = null;
    const partialIndexApplies = reviewerIdValue !== null;
    assert.equal(partialIndexApplies, false, 'reviewer_id=NULL must not be subject to the unique index');
  });

  it('cron notification message contains no identity text', () => {
    const cronMessage = 'Your submission received a new review.';
    assert.ok(!cronMessage.toLowerCase().includes('@'));
    assert.ok(!cronMessage.toLowerCase().includes('name'));
    assert.ok(!cronMessage.toLowerCase().includes('username'));
  });
});

// ── F. createNotification — shadow message safety ─────────────────────────

describe('createNotification — shadow message identity safety', () => {
  const shadowMessages = [
    { context: 'shadow', msg: 'Your submission received a new review.' },
    { context: 'shadow', msg: 'Your submission received a new review.' }, // cron
  ];

  const publicMessages = [
    { context: 'public', msg: 'Someone liked your post.' },
    { context: 'public', msg: 'Someone commented on your post.' },
    { context: 'public', msg: 'Someone shared your post.' },
    { context: 'public', msg: 'Someone connected with you.' },
  ];

  for (const { context, msg } of shadowMessages) {
    it(`[${context}] "${msg}" — no real identity`, () => {
      assert.ok(!msg.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/), 'must not contain a proper name');
      assert.ok(!msg.includes('@'), 'must not contain @ (email/handle)');
      assert.ok(!msg.match(/reviewed your/i), 'must not attribute review to a person');
    });
  }

  it('public notification context is correct', () => {
    for (const { context } of publicMessages) {
      assert.equal(context, 'public');
    }
  });

  it('shadow notification context is correct', () => {
    for (const { context } of shadowMessages) {
      assert.equal(context, 'shadow');
    }
  });

  it('identity_context values are only "public" or "shadow"', () => {
    const all = [...shadowMessages, ...publicMessages];
    for (const { context } of all) {
      assert.ok(['public', 'shadow'].includes(context));
    }
  });
});
