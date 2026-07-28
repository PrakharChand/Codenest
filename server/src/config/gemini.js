/**
 * server/src/config/gemini.js
 *
 * Google Gemini SDK client — replaces Anthropic.
 * Model: gemini-1.5-flash (free tier, fast, sufficient for all five AI features).
 * Key read from env.GEMINI_API_KEY (set in Render env vars + .env).
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('./env');

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');

const GEMINI_MODEL = 'gemini-1.5-flash';

module.exports = { genAI, GEMINI_MODEL };
