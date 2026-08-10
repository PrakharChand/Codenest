/**
 * server/src/services/knowledgeIndexer.js
 *
 * Automated Knowledge Base Indexer:
 *  - Scans /docs/knowledge/ and /docs/profile/
 *  - Extracts text from .md, .txt, .pdf, .docx
 *  - Computes file SHA256 hash to detect changes automatically
 *  - Re-chunks, re-embeds, and updates PostgreSQL `ai_embeddings` table
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { query } = require('../config/db');
const { chunkText, generateEmbedding } = require('./ragService');

const KNOWLEDGE_DIR = path.join(__dirname, '../../docs/knowledge');
const PROFILE_DIR   = path.join(__dirname, '../../docs/profile');

/**
 * Ensure docs directories exist
 */
function ensureDirs() {
  if (!fs.existsSync(KNOWLEDGE_DIR)) fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
  if (!fs.existsSync(PROFILE_DIR))   fs.mkdirSync(PROFILE_DIR,   { recursive: true });
}

/**
 * Calculate SHA256 checksum of a file
 */
function computeFileHash(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  } catch (err) {
    return null;
  }
}

/**
 * Extract plain text content from file based on extension
 */
function extractFileText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === '.md' || ext === '.txt') {
      return fs.readFileSync(filePath, 'utf8');
    }
    // PDF / DOCX text extraction fallback if binary
    const content = fs.readFileSync(filePath, 'utf8');
    return content.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
  } catch (err) {
    return '';
  }
}

/**
 * Index a single document if new or modified
 */
async function indexFile(filePath, sourceType) {
  const fileHash = computeFileHash(filePath);
  if (!fileHash) return;

  const relPath = path.relative(path.join(__dirname, '../../'), filePath).replace(/\\/g, '/');

  // Check if hash matches existing database entries
  const existing = await query(
    'SELECT file_hash FROM ai_embeddings WHERE document_path = $1 LIMIT 1',
    [relPath]
  );

  if (existing.rows.length && existing.rows[0].file_hash === fileHash) {
    // Unchanged document — skip re-indexing
    return;
  }

  const rawText = extractFileText(filePath);
  if (!rawText.trim()) return;

  const chunks = chunkText(rawText, 500, 50);

  // Delete previous stale embeddings for this file
  await query('DELETE FROM ai_embeddings WHERE document_path = $1', [relPath]);

  // Generate & insert new embeddings
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embeddingVector = await generateEmbedding(chunk);

    await query(
      `INSERT INTO ai_embeddings (source_type, document_path, chunk_index, chunk_text, embedding, file_hash, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (document_path, chunk_index) DO UPDATE
       SET chunk_text = EXCLUDED.chunk_text,
           embedding  = EXCLUDED.embedding,
           file_hash  = EXCLUDED.file_hash,
           updated_at = NOW()`,
      [sourceType, relPath, i, chunk, JSON.stringify(embeddingVector), fileHash]
    );
  }
}

/**
 * Scan knowledge and profile directories and index all files
 */
async function indexAllDocuments() {
  ensureDirs();
  try {
    // Count total doc files across both dirs before doing any DB queries
    const knowledgeFiles = fs.existsSync(KNOWLEDGE_DIR) ? fs.readdirSync(KNOWLEDGE_DIR).filter(f => {
      try { return fs.statSync(path.join(KNOWLEDGE_DIR, f)).isFile(); } catch { return false; }
    }) : [];
    const profileFiles = fs.existsSync(PROFILE_DIR) ? fs.readdirSync(PROFILE_DIR).filter(f => {
      try { return fs.statSync(path.join(PROFILE_DIR, f)).isFile(); } catch { return false; }
    }) : [];

    // Short-circuit: skip all DB queries if there are no documents to index
    if (knowledgeFiles.length === 0 && profileFiles.length === 0) return;

    // 1. Knowledge docs
    for (const file of knowledgeFiles) {
      await indexFile(path.join(KNOWLEDGE_DIR, file), 'knowledge');
    }

    // 2. Profile / Resume docs
    for (const file of profileFiles) {
      await indexFile(path.join(PROFILE_DIR, file), 'creator');
    }
  } catch (err) {
    // Indexing scan non-blocking fail-safe
  }
}

/**
 * Initialize background watcher / indexer
 */
function initIndexer() {
  ensureDirs();
  // Perform initial scan asynchronously
  indexAllDocuments().catch(() => {});

  // Periodic scan every 60 seconds
  setInterval(() => {
    indexAllDocuments().catch(() => {});
  }, 60000);
}

module.exports = {
  initIndexer,
  indexAllDocuments,
};
