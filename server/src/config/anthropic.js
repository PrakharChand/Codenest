/**
 * server/src/config/anthropic.js
 *
 * Anthropic SDK client — key from env.js.
 * Model: claude-sonnet-4-6 (as specified in the locked stack).
 */

const Anthropic = require('@anthropic-ai/sdk');
const env       = require('./env');

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

const CLAUDE_MODEL = 'claude-sonnet-4-6';

module.exports = { anthropic, CLAUDE_MODEL };
