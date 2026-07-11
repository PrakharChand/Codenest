/**
 * server/src/db/migrate.js
 *
 * Plain pg migration runner — no ORM, no heavy framework.
 * Reads numbered .sql files from ./migrations/ in sorted order,
 * skips files already recorded in _migrations, runs the rest
 * inside individual transactions, and stops on the first failure.
 *
 * Usage:  node src/db/migrate.js
 * npm:    npm run migrate
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { getClient } = require('../config/db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Ensure the _migrations tracking table exists.
 * Uses IF NOT EXISTS — safe to call every run.
 */
const CREATE_TRACKING_TABLE = `
  CREATE TABLE IF NOT EXISTS _migrations (
    filename   TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

async function migrate() {
  const client = await getClient();
  console.log('[migrate] Connected to database.');

  try {
    // ── 1. Ensure tracking table exists ──────────────────────────────
    await client.query(CREATE_TRACKING_TABLE);

    // ── 2. Fetch already-applied migrations ───────────────────────────
    const { rows: applied } = await client.query(
      'SELECT filename FROM _migrations ORDER BY filename'
    );
    const appliedSet = new Set(applied.map(r => r.filename));
    console.log(`[migrate] Already applied: ${appliedSet.size} migration(s).`);

    // ── 3. Read migration files in sorted order ───────────────────────
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort(); // lexicographic = numeric order for 001_, 002_, …

    let newCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[migrate] ⏭  Skip (already applied): ${file}`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`[migrate] ▶  Applying: ${file}`);

      // ── Each migration runs inside its own transaction ────────────
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[migrate] ✅ Applied: ${file}`);
        newCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrate] ❌ FAILED on: ${file}`);
        console.error(`[migrate]    Error: ${err.message}`);
        process.exit(1); // Stop immediately — do not continue to the next file
      }
    }

    // ── 4. Summary ────────────────────────────────────────────────────
    if (newCount === 0) {
      console.log('[migrate] ✅ Nothing to apply — schema is up to date.');
    } else {
      console.log(`[migrate] ✅ Done. Applied ${newCount} new migration(s).`);
    }

    // Print current state of _migrations
    const { rows: all } = await client.query(
      'SELECT filename, applied_at FROM _migrations ORDER BY filename'
    );
    console.log('\n[migrate] Current _migrations table:');
    all.forEach(r =>
      console.log(`  ${r.filename.padEnd(35)} applied at ${r.applied_at.toISOString()}`)
    );

  } finally {
    client.release();
    // Allow the process to exit naturally — pool stays alive only until then
    process.exit(0);
  }
}

migrate().catch(err => {
  console.error('[migrate] Fatal:', err.message);
  process.exit(1);
});
