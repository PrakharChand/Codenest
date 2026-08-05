/**
 * server/src/services/ragService.js
 *
 * RAG Vector Service:
 *  - Document text chunking (500 chars, 50 overlap)
 *  - Embedding generation (Gemini embedding API or normalized vector fallback)
 *  - Cosine similarity vector search over PostgreSQL `ai_embeddings`
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../config/env');
const { query } = require('../config/db');

const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Split text into chunks of specified length with overlap
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
  if (!text || typeof text !== 'string') return [];
  const clean = text.replace(/\r\n/g, '\n');
  const chunks = [];
  let index = 0;

  while (index < clean.length) {
    const chunk = clean.slice(index, index + chunkSize).trim();
    if (chunk.length > 20) {
      chunks.push(chunk);
    }
    index += chunkSize - overlap;
  }
  return chunks;
}

/**
 * Fallback lightweight vector generator when API key is missing or rate limited
 */
function generateFallbackVector(text) {
  const dim = 128;
  const vector = new Array(dim).fill(0);
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash * 31 + word.charCodeAt(j)) % dim;
    }
    vector[Math.abs(hash)] += 1;
  }

  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map((v) => Number((v / magnitude).toFixed(6)));
}

/**
 * Compute vector embedding for text using Gemini text-embedding-004
 */
async function generateEmbedding(text) {
  if (!text) return generateFallbackVector('');
  try {
    if (genAI) {
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      if (result.embedding?.values) {
        return result.embedding.values;
      }
    }
  } catch (err) {
    // Quota or model error → graceful fallback to local feature vector
  }
  return generateFallbackVector(text);
}

/**
 * Calculate cosine similarity between two float vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Perform semantic search against ai_embeddings table
 * @param {string} queryText - User question
 * @param {'knowledge'|'creator'|'all'} sourceType
 * @param {number} topK - Number of chunks to retrieve
 */
async function searchVectorContext(queryText, sourceType = 'all', topK = 4) {
  const queryVector = await generateEmbedding(queryText);

  let sql = 'SELECT id, source_type, document_path, chunk_index, chunk_text, embedding FROM ai_embeddings';
  const params = [];

  if (sourceType && sourceType !== 'all') {
    sql += ' WHERE source_type = $1';
    params.push(sourceType);
  }

  const { rows } = await query(sql, params);
  if (!rows.length) return [];

  const scored = rows.map((row) => {
    let emb = row.embedding;
    if (typeof emb === 'string') {
      try { emb = JSON.parse(emb); } catch (e) { emb = []; }
    }
    const similarity = cosineSimilarity(queryVector, emb);
    return { ...row, similarity };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}

module.exports = {
  chunkText,
  generateEmbedding,
  cosineSimilarity,
  searchVectorContext,
};
