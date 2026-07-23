/**
 * server/src/__tests__/staticAudit.test.js
 *
 * Phase 6 Task 4 — Static consistency audit.
 *
 * Reads source files from disk and asserts codebase-wide conventions
 * without needing a database or HTTP server.
 *
 * Checks:
 *   1. No SELECT * anywhere in server/src/
 *   2. Every route handler wrapped in asyncHandler
 *   3. Shadow routes behind group guard in app.js
 *   4. Every list endpoint uses paginate.js
 *   5. No process.env access outside config/env.js (excluding tests + db scripts)
 *   6. .env.example lists every variable env.js reads
 *   7. No committed secret patterns
 */

'use strict';

// Minimal env vars so importing modules doesn't crash env.js validation
process.env.JWT_ACCESS_SECRET  = 'test-access-secret-at-least-32-chars-long-abc';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-different-from-access-xyz';
process.env.DATABASE_URL = 'postgresql://placeholder';
process.env.CLIENT_URL   = 'http://localhost:5173';
process.env.PORT         = '5000';
process.env.NODE_ENV     = 'test';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const path   = require('path');

const SRC_DIR  = path.join(__dirname, '..');
const ROOT_DIR = path.join(__dirname, '..', '..', '..');

// ── Helpers ──────────────────────────────────────────────────────────────

/** Recursively collect .js files under a directory */
function collectJsFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      collectJsFiles(full, files);
    } else if (entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

/** Strip comments from JS source (simple but good enough for grep-level checks) */
function stripComments(src) {
  return src
    .replace(/\/\/[^\n]*/g, '')         // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '');  // multi-line comments
}

// Collect all source files once
const allSourceFiles = collectJsFiles(SRC_DIR);

// ── 1. No SELECT * ──────────────────────────────────────────────────────

describe('Static audit — No SELECT *', () => {
  for (const filePath of allSourceFiles) {
    const rel = path.relative(SRC_DIR, filePath);

    it(`${rel} has no SELECT *`, () => {
      const src = fs.readFileSync(filePath, 'utf8');
      const clean = stripComments(src);
      // Match SELECT * but not SELECT COUNT(*)
      const matches = clean.match(/SELECT\s+\*/gi) || [];
      const realMatches = matches.filter(m => !m.match(/SELECT\s+COUNT\(\*\)/i));
      assert.equal(
        realMatches.length, 0,
        `Found SELECT * in ${rel} (excluding COUNT(*)). Use explicit column lists.`
      );
    });
  }
});

// ── 2. asyncHandler wrapping ─────────────────────────────────────────────

describe('Static audit — asyncHandler wrapping in route files', () => {
  const routeDir = path.join(SRC_DIR, 'routes');
  if (!fs.existsSync(routeDir)) return;

  const routeFiles = fs.readdirSync(routeDir)
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(routeDir, f));

  for (const filePath of routeFiles) {
    const filename = path.basename(filePath);

    it(`${filename} — every route handler is wrapped in asyncHandler`, () => {
      const src = fs.readFileSync(filePath, 'utf8');
      const clean = stripComments(src);

      // Find route registrations: router.get/post/put/delete/patch(...)
      // Use a looser regex that captures until the semicolon or end of line
      const routePatterns = clean.match(/router\.(get|post|put|delete|patch)\([^;]+\)/g) || [];

      for (const pattern of routePatterns) {
        // Each route call should contain asyncHandler
        // Exception: routes that only use middleware (no controller)
        if (pattern.includes('passport.authenticate')) continue;
        assert.ok(
          pattern.includes('asyncHandler') || pattern.includes('passport'),
          `Route handler in ${filename} not wrapped in asyncHandler: ${pattern.slice(0, 80)}`
        );
      }
    });

    it(`${filename} — imports asyncHandler`, () => {
      const src = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        src.includes("require('../utils/asyncHandler')") || src.includes("require('./asyncHandler')"),
        `${filename} does not import asyncHandler`
      );
    });
  }
});

// ── 3. Shadow group guard in app.js ──────────────────────────────────────

describe('Static audit — Shadow group guard', () => {
  const appPath = path.join(SRC_DIR, 'app.js');

  it('app.js mounts /api/shadow with requireAuth AND requireAnonymousIdentity', () => {
    const src = fs.readFileSync(appPath, 'utf8');
    const clean = stripComments(src);

    // The mount line should contain both guards
    const shadowMount = clean.match(/app\.use\([^;]*shadow[^;]*\)/i);
    assert.ok(shadowMount, 'No shadow mount found in app.js');

    const mountLine = shadowMount[0];
    assert.ok(mountLine.includes('requireAuth'), 'Shadow mount missing requireAuth');
    assert.ok(mountLine.includes('requireAnonymousIdentity'), 'Shadow mount missing requireAnonymousIdentity');
  });

  it('Shadow routes do NOT re-add requireAuth per-route', () => {
    const shadowRoutesPath = path.join(SRC_DIR, 'routes', 'shadowRoutes.js');
    const src = fs.readFileSync(shadowRoutesPath, 'utf8');
    const clean = stripComments(src);

    // Route registrations should not contain requireAuth (it's at mount level)
    const routeLines = clean.match(/router\.(get|post|put|delete)\([^;]*\)/g) || [];
    for (const line of routeLines) {
      assert.ok(
        !line.includes('requireAuth'),
        `shadowRoutes.js has per-route requireAuth — this should be mount-level only: ${line.slice(0, 80)}`
      );
    }
  });
});

// ── 4. Pagination usage ──────────────────────────────────────────────────

describe('Static audit — paginate.js usage in list endpoints', () => {
  const controllerDir = path.join(SRC_DIR, 'controllers');
  if (!fs.existsSync(controllerDir)) return;

  const controllerFiles = fs.readdirSync(controllerDir)
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(controllerDir, f));

  for (const filePath of controllerFiles) {
    const filename = path.basename(filePath);
    const src = fs.readFileSync(filePath, 'utf8');
    const clean = stripComments(src);

    // If this controller has a LIMIT/OFFSET pattern, it should import paginate
    if (clean.match(/LIMIT\s+\$/i) && clean.match(/OFFSET\s+\$/i)) {
      it(`${filename} — imports paginate.js (uses LIMIT/OFFSET)`, () => {
        assert.ok(
          src.includes("require('../utils/paginate')"),
          `${filename} uses LIMIT/OFFSET but does not import paginate.js`
        );
      });
    }
  }
});

// ── 5. No process.env outside config/env.js ─────────────────────────────

describe('Static audit — process.env confined to config/', () => {
  // Exclude: config/, __tests__/, db/ scripts (CLI bootstraps), server.js (reads env for port)
  const excludeDirs  = ['config', '__tests__', 'db'];
  const excludeFiles = ['server.js'];

  const filesToCheck = allSourceFiles.filter(f => {
    const rel = path.relative(SRC_DIR, f);
    const parts = rel.split(path.sep);
    if (excludeDirs.includes(parts[0])) return false;
    if (excludeFiles.includes(path.basename(f))) return false;
    return true;
  });

  for (const filePath of filesToCheck) {
    const rel = path.relative(SRC_DIR, filePath);

    it(`${rel} does not read process.env directly`, () => {
      const src = fs.readFileSync(filePath, 'utf8');
      const clean = stripComments(src);
      assert.ok(
        !clean.includes('process.env'),
        `${rel} reads process.env directly — import from config/env.js instead`
      );
    });
  }
});

// ── 6. .env.example completeness ─────────────────────────────────────────

describe('Static audit — .env.example completeness', () => {
  const envExamplePath = path.join(ROOT_DIR, 'server', '.env.example');
  const envJsPath      = path.join(SRC_DIR, 'config', 'env.js');

  it('.env.example exists', () => {
    assert.ok(fs.existsSync(envExamplePath), '.env.example not found');
  });

  it('.env.example lists every variable env.js reads', () => {
    if (!fs.existsSync(envExamplePath)) return;

    const envExample = fs.readFileSync(envExamplePath, 'utf8');
    const envJs      = fs.readFileSync(envJsPath, 'utf8');

    // Extract all process.env.VARIABLE_NAME references from env.js
    const envVars = (envJs.match(/process\.env\.([A-Z_]+)/g) || [])
      .map(m => m.replace('process.env.', ''));
    const unique = [...new Set(envVars)];

    for (const varName of unique) {
      if (varName === 'NODE_ENV') continue; // NODE_ENV is set by system, not .env
      assert.ok(
        envExample.includes(varName),
        `.env.example is missing ${varName} (used in env.js)`
      );
    }
  });
});

// ── 7. No committed secrets ──────────────────────────────────────────────

describe('Static audit — no committed secrets', () => {
  // Check all JS files for common secret patterns
  const secretPatterns = [
    /sk-ant-[a-zA-Z0-9]{20,}/,           // Anthropic API key
    /sk-[a-zA-Z0-9]{32,}/,               // Generic secret key
    /ghp_[a-zA-Z0-9]{36}/,               // GitHub personal access token
    /gho_[a-zA-Z0-9]{36}/,               // GitHub OAuth token
    /AIza[0-9A-Za-z_-]{35}/,             // Google API key
    /password\s*[:=]\s*['"][^'"]{8,}['"]/i, // Hardcoded password (not placeholder)
  ];

  for (const filePath of allSourceFiles) {
    const rel = path.relative(SRC_DIR, filePath);

    it(`${rel} contains no committed secrets`, () => {
      const src = fs.readFileSync(filePath, 'utf8');
      for (const pattern of secretPatterns) {
        const match = src.match(pattern);
        assert.ok(
          !match,
          `Possible committed secret in ${rel}: ${match?.[0]?.slice(0, 20)}...`
        );
      }
    });
  }
});
