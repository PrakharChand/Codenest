/**
 * server/src/db/migrate.js
 *
 * Plain pg migration runner — no ORM, no heavy framework.
 * Reads numbered .sql files from ./migrations/ in sorted order,
 * skips files already recorded in _migrations, runs the rest
 * inside individual transactions, and stops on the first failure.
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { getClient } = require('../config/db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const CREATE_TRACKING_TABLE = `
  CREATE TABLE IF NOT EXISTS _migrations (
    filename   TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

async function runMigrations({ exitOnFinish = false } = {}) {
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
      .sort();

    let newCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[migrate] ⏭  Skip (already applied): ${file}`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`[migrate] ▶  Applying: ${file}`);

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
        if (exitOnFinish) process.exit(1);
        throw err;
      }
    }

    if (newCount === 0) {
      console.log('[migrate] ✅ Schema is up to date.');
    } else {
      console.log(`[migrate] ✅ Done. Applied ${newCount} new migration(s).`);
    }
  } finally {
    client.release();
    if (exitOnFinish) {
      process.exit(0);
    }
  }
}

// If invoked directly from CLI: node src/db/migrate.js
if (require.main === module) {
  runMigrations({ exitOnFinish: true }).catch((err) => {
    console.error('[migrate] Fatal:', err.message);
    process.exit(1);
  });
}

module.exports = { runMigrations };
