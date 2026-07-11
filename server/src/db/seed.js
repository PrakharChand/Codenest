/**
 * server/src/db/seed.js
 *
 * Seeds deterministic lookup data only — NO fake users.
 * Safe to run multiple times: all inserts use ON CONFLICT DO NOTHING.
 *
 * Seeded data:
 *   1. anon_adjectives — Rule 3 username generator pool (30 words)
 *   2. anon_animals    — Rule 3 username generator pool (30 words)
 *   3. tags            — starter tech taxonomy (8 tags)
 *
 * Number range for username generation (1–99) is handled in code
 * at identity-creation time (Phase 2) — no DB table needed.
 *
 * Usage:  node src/db/seed.js
 * npm:    npm run seed
 */

require('dotenv').config();
const { query } = require('../config/db');

// ─── Adjective pool (Rule 3 — anonymous username generator) ───────────────
// 30 clean, non-identifying, positive-neutral adjectives.
// Chosen to avoid anything that could be read as offensive or identifiable.
const ADJECTIVES = [
  'Silent',   'Quiet',    'Rapid',    'Clever',   'Calm',
  'Swift',    'Bright',   'Steady',   'Bold',     'Keen',
  'Nimble',   'Brave',    'Sharp',    'Gentle',   'Vivid',
  'Serene',   'Agile',    'Crisp',    'Witty',    'Lucid',
  'Cosmic',   'Amber',    'Azure',    'Ember',    'Frosty',
  'Golden',   'Mystic',   'Onyx',     'Solar',    'Verdant',
];

// ─── Animal pool (Rule 3 — anonymous username generator) ──────────────────
// 30 non-threatening, recognizable animals.
// Avoids anything that could carry negative cultural connotations.
const ANIMALS = [
  'Fox',      'Wolf',     'Heron',    'Falcon',   'Otter',
  'Lynx',     'Crane',    'Raven',    'Moose',    'Bison',
  'Panda',    'Koala',    'Lemur',    'Gecko',    'Ibis',
  'Finch',    'Wren',     'Egret',    'Kestrel',  'Marten',
  'Badger',   'Ferret',   'Vole',     'Newt',     'Osprey',
  'Condor',   'Puffin',   'Marmot',   'Dingo',    'Quokka',
];

// ─── Starter tech tags ────────────────────────────────────────────────────
const TAGS = [
  'react',
  'javascript',
  'python',
  'dsa',
  'system-design',
  'backend',
  'css',
  'node',
];

// ─── Helpers ──────────────────────────────────────────────────────────────

async function seedTable(tableName, column, values) {
  let inserted = 0;
  let skipped  = 0;

  for (const value of values) {
    const result = await query(
      `INSERT INTO ${tableName} (${column}) VALUES ($1) ON CONFLICT DO NOTHING`,
      [value]
    );
    if (result.rowCount > 0) inserted++;
    else skipped++;
  }

  console.log(
    `[seed] ${tableName.padEnd(20)} → inserted: ${inserted}, skipped (already existed): ${skipped}`
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function seed() {
  console.log('[seed] Starting seed run…\n');

  try {
    await seedTable('anon_adjectives', 'word', ADJECTIVES);
    await seedTable('anon_animals',    'word', ANIMALS);
    await seedTable('tags',            'name', TAGS);

    // Verify row counts
    const adjCount   = await query('SELECT COUNT(*) FROM anon_adjectives');
    const animCount  = await query('SELECT COUNT(*) FROM anon_animals');
    const tagCount   = await query('SELECT COUNT(*) FROM tags');

    console.log('\n[seed] ✅ Seed complete. Table counts:');
    console.log(`  anon_adjectives: ${adjCount.rows[0].count}`);
    console.log(`  anon_animals:    ${animCount.rows[0].count}`);
    console.log(`  tags:            ${tagCount.rows[0].count}`);
    console.log('\n[seed] Note: number range for username generation is 1–99, handled in code (Phase 2).');

  } catch (err) {
    console.error('[seed] ❌ Error:', err.message);
    process.exit(1);
  }

  process.exit(0);
}

seed();
