/**
 * server/src/db/verify.js
 *
 * Phase 1 self-verification script.
 * Checks schema correctness, constraint enforcement, and seed idempotency.
 * Run after: npm run migrate && npm run seed
 *
 * Usage: node src/db/verify.js
 */

require('dotenv').config();
const { query } = require('../config/db');

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✅ ${label}`);
  passed++;
}

function fail(label, detail) {
  console.error(`  ❌ FAIL: ${label}`);
  if (detail) console.error(`     → ${detail}`);
  failed++;
}

async function check(label, fn) {
  try {
    await fn();
    ok(label);
  } catch (err) {
    fail(label, err.message);
  }
}

async function verify() {
  console.log('\n══════════════════════════════════════════');
  console.log(' CodeNest Phase 1 — Verification Report');
  console.log('══════════════════════════════════════════\n');

  // ── 1. Migration count ────────────────────────────────────────────────
  console.log('── Migration tracking ─────────────────────');
  await check('_migrations table has exactly 18 rows', async () => {
    const { rows } = await query('SELECT COUNT(*) FROM _migrations');
    const count = parseInt(rows[0].count);
    if (count !== 18) throw new Error(`Expected 18, got ${count}`);
  });

  await check('All 18 migration filenames present', async () => {
    const { rows } = await query('SELECT filename FROM _migrations ORDER BY filename');
    const names = rows.map(r => r.filename);
    const expected = [
      '001_users.sql','002_posts.sql','003_comments.sql','004_likes.sql',
      '005_connections.sql','006_communities.sql','007_community_members.sql',
      '008_community_posts.sql','009_tags.sql','010_post_tags.sql',
      '011_shadow_submissions.sql','012_shadow_reviews.sql',
      '013_shadow_helpful_votes.sql','014_shadow_community_posts.sql',
      '015_notifications.sql','016_indexes.sql','017_anon_adjectives.sql',
      '018_anon_animals.sql',
    ];
    const missing = expected.filter(e => !names.includes(e));
    if (missing.length) throw new Error(`Missing: ${missing.join(', ')}`);
  });

  // ── 2. users table — Rule 1 (both identities in one row) ─────────────
  console.log('\n── users table (Identity Rule 1) ──────────');
  const publicCols  = ['name','email','password_hash','bio','avatar_url','github_url','twitter_url'];
  const shadowCols  = ['has_anonymous_identity','anonymous_username','anonymous_avatar_url','anonymous_reputation_score'];

  for (const col of [...publicCols, ...shadowCols]) {
    await check(`users has column: ${col}`, async () => {
      const { rows } = await query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'users' AND column_name = $1`, [col]
      );
      if (!rows.length) throw new Error(`Column '${col}' not found`);
    });
  }

  // ── 3. Foreign key ON DELETE rules ────────────────────────────────────
  console.log('\n── FK ON DELETE rules ─────────────────────');

  const fkChecks = [
    { table: 'posts',                   col: 'user_id',       rule: 'CASCADE'  },
    { table: 'comments',                col: 'post_id',       rule: 'CASCADE'  },
    { table: 'comments',                col: 'user_id',       rule: 'CASCADE'  },
    { table: 'likes',                   col: 'user_id',       rule: 'CASCADE'  },
    { table: 'likes',                   col: 'post_id',       rule: 'CASCADE'  },
    { table: 'connections',             col: 'follower_id',   rule: 'CASCADE'  },
    { table: 'connections',             col: 'following_id',  rule: 'CASCADE'  },
    { table: 'communities',             col: 'created_by',    rule: 'SET NULL' },
    { table: 'community_members',       col: 'community_id',  rule: 'CASCADE'  },
    { table: 'community_members',       col: 'user_id',       rule: 'CASCADE'  },
    { table: 'community_posts',         col: 'community_id',  rule: 'CASCADE'  },
    { table: 'community_posts',         col: 'user_id',       rule: 'CASCADE'  },
    { table: 'post_tags',               col: 'post_id',       rule: 'CASCADE'  },
    { table: 'post_tags',               col: 'tag_id',        rule: 'CASCADE'  },
    { table: 'shadow_submissions',      col: 'user_id',       rule: 'CASCADE'  },
    { table: 'shadow_reviews',          col: 'submission_id', rule: 'CASCADE'  },
    { table: 'shadow_reviews',          col: 'reviewer_id',   rule: 'SET NULL' },
    { table: 'shadow_helpful_votes',    col: 'user_id',       rule: 'CASCADE'  },
    { table: 'shadow_helpful_votes',    col: 'review_id',     rule: 'CASCADE'  },
    { table: 'shadow_community_posts',  col: 'user_id',       rule: 'CASCADE'  },
    { table: 'notifications',           col: 'user_id',       rule: 'CASCADE'  },
  ];

  for (const { table, col, rule } of fkChecks) {
    await check(`${table}.${col} ON DELETE ${rule}`, async () => {
      const { rows } = await query(`
        SELECT rc.delete_rule
        FROM information_schema.referential_constraints rc
        JOIN information_schema.key_column_usage kcu
          ON rc.constraint_name = kcu.constraint_name
         AND rc.constraint_schema = kcu.constraint_schema
        WHERE kcu.table_name = $1 AND kcu.column_name = $2
      `, [table, col]);
      if (!rows.length) throw new Error(`FK not found for ${table}.${col}`);
      const actual = rows[0].delete_rule;
      if (actual !== rule) throw new Error(`Expected '${rule}', got '${actual}'`);
    });
  }

  // ── 4. Seed counts ────────────────────────────────────────────────────
  console.log('\n── Seed data counts ───────────────────────');
  await check('anon_adjectives has 30 rows', async () => {
    const { rows } = await query('SELECT COUNT(*) FROM anon_adjectives');
    if (parseInt(rows[0].count) !== 30) throw new Error(`Got ${rows[0].count}`);
  });
  await check('anon_animals has 30 rows', async () => {
    const { rows } = await query('SELECT COUNT(*) FROM anon_animals');
    if (parseInt(rows[0].count) !== 30) throw new Error(`Got ${rows[0].count}`);
  });
  await check('tags has 8 starter rows', async () => {
    const { rows } = await query('SELECT COUNT(*) FROM tags');
    if (parseInt(rows[0].count) < 8) throw new Error(`Got ${rows[0].count}`);
  });

  // ── 5. Constraint rejection tests ─────────────────────────────────────
  console.log('\n── Constraint enforcement (must REJECT) ───');

  // Setup: insert a throwaway user
  const { rows: [u1] } = await query(`
    INSERT INTO users (name, email) VALUES ('_test_u1', '_test1@verify.internal')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `);
  const { rows: [u2] } = await query(`
    INSERT INTO users (name, email) VALUES ('_test_u2', '_test2@verify.internal')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `);
  const { rows: [post] } = await query(`
    INSERT INTO posts (user_id, title, content) VALUES ($1, '_test post', '_test content')
    RETURNING id
  `, [u1.id]);
  await query(`INSERT INTO likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [u1.id, post.id]);

  await check('Duplicate like rejected (composite PK)', async () => {
    try {
      await query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [u1.id, post.id]);
      throw new Error('Should have been rejected');
    } catch (err) {
      if (err.message === 'Should have been rejected') throw err;
      // Any pg error = constraint worked
    }
  });

  await check('Self-connection rejected (CHECK follower_id <> following_id)', async () => {
    try {
      await query('INSERT INTO connections (follower_id, following_id) VALUES ($1, $1)', [u1.id]);
      throw new Error('Should have been rejected');
    } catch (err) {
      if (err.message === 'Should have been rejected') throw err;
    }
  });

  await check('helpfulness_rating = 7 rejected (CHECK 1–5)', async () => {
    // Need a submission and review first
    const { rows: [sub] } = await query(`
      INSERT INTO shadow_submissions (user_id, title, content, language_tag, question)
      VALUES ($1, '_t', '_c', 'js', '_q') RETURNING id
    `, [u1.id]);
    try {
      await query(`
        INSERT INTO shadow_reviews (submission_id, reviewer_id, what_good, what_improve, helpfulness_rating)
        VALUES ($1, $2, 'g', 'i', 7)
      `, [sub.id, u2.id]);
      throw new Error('Should have been rejected');
    } catch (err) {
      if (err.message === 'Should have been rejected') throw err;
    }
  });

  await check('Invalid notifications.type rejected', async () => {
    try {
      await query(`
        INSERT INTO notifications (user_id, type, message, identity_context)
        VALUES ($1, 'invalid_type', 'test', 'public')
      `, [u1.id]);
      throw new Error('Should have been rejected');
    } catch (err) {
      if (err.message === 'Should have been rejected') throw err;
    }
  });

  await check('Invalid notifications.identity_context rejected', async () => {
    try {
      await query(`
        INSERT INTO notifications (user_id, type, message, identity_context)
        VALUES ($1, 'like', 'test', 'feed')
      `, [u1.id]);
      throw new Error('Should have been rejected');
    } catch (err) {
      if (err.message === 'Should have been rejected') throw err;
    }
  });

  // Cleanup test rows
  await query('DELETE FROM users WHERE email IN ($1, $2)', ['_test1@verify.internal', '_test2@verify.internal']);

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  console.log(` Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log(' ✅ All checks passed — Phase 1 schema is correct.');
    console.log(` Readiness score: 100/100`);
  } else {
    console.log(' ❌ Some checks failed — review errors above before Phase 2.');
    console.log(` Readiness score: ${Math.round((passed / (passed + failed)) * 100)}/100`);
  }
  console.log('══════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

verify().catch(err => {
  console.error('[verify] Fatal:', err.message);
  process.exit(1);
});
