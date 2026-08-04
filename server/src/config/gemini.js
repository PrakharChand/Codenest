/**
 * server/src/config/gemini.js
 *
 * Centralized Google Gemini SDK client initialization.
 * Active active models: 'gemini-flash-latest', 'gemini-1.5-flash-8b'.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('./env');

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');
const GEMINI_MODEL = env.GEMINI_MODEL || 'gemini-flash-latest';

// Fallback models in priority order — active free-tier aliases first
const FALLBACK_MODELS = [
  GEMINI_MODEL,
  'gemini-flash-latest',
  'gemini-1.5-flash-8b',
  'gemini-2.0-flash',
].filter((model, index, self) => self.indexOf(model) === index);

module.exports = { genAI, GEMINI_MODEL, FALLBACK_MODELS };
