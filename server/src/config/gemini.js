/**
 * server/src/config/gemini.js
 *
 * Centralized Google Gemini SDK client initialization.
 * Reads GEMINI_API_KEY and GEMINI_MODEL directly from env configuration.
 * Exposes an automatic model fallback chain if a model returns 404.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('./env');

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');
const GEMINI_MODEL = env.GEMINI_MODEL || 'gemini-2.5-flash';

// Fallback models in priority order if the configured model returns 404
const FALLBACK_MODELS = [
  GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-flash-latest',
].filter((model, index, self) => self.indexOf(model) === index);

module.exports = { genAI, GEMINI_MODEL, FALLBACK_MODELS };
