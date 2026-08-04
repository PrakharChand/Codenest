/**
 * server/src/config/gemini.js
 *
 * Centralized Google Gemini SDK client initialization.
 * Reads GEMINI_API_KEY and GEMINI_MODEL directly from env configuration.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('./env');

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');
const GEMINI_MODEL = env.GEMINI_MODEL;

module.exports = { genAI, GEMINI_MODEL };
