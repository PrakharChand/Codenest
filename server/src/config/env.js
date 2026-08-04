/**
 * server/src/config/env.js
 *
 * Single source for all environment variables.
 * Convention: NO other file reads process.env directly — they import from here.
 * Keeps secrets and settings centralized, validated, and documented.
 */

require('dotenv').config();

const REQUIRED = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CLIENT_URL',
  'PORT',
];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error('\n❌ CodeNest server cannot start — missing required environment variables:');
  missing.forEach((key) => console.error(`   • ${key}`));
  console.error('\nCopy server/.env.example → server/.env and fill in the missing values.\n');
  process.exit(1);
}

const env = Object.freeze({
  // Server
  PORT:              parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV:          process.env.NODE_ENV || 'development',

  // Database
  DATABASE_URL:      process.env.DATABASE_URL,

  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET:process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN:  process.env.JWT_ACCESS_EXPIRES_IN  || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY:    process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // OAuth
  GITHUB_CLIENT_ID:      process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET:  process.env.GITHUB_CLIENT_SECRET,
  GITHUB_CALLBACK_URL:   process.env.GITHUB_CALLBACK_URL,
  GOOGLE_CLIENT_ID:      process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET:  process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL:   process.env.GOOGLE_CALLBACK_URL,

  // Google Gemini AI Configuration (No magic numbers)
  GEMINI_API_KEY:        process.env.GEMINI_API_KEY,
  GEMINI_MODEL:          process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  AI_TIMEOUT_MS:         parseInt(process.env.AI_TIMEOUT_MS, 10) || 15000,
  AI_MAX_RETRIES:        parseInt(process.env.AI_MAX_RETRIES, 10) || 2,
  AI_CACHE_TTL_MS:       parseInt(process.env.AI_CACHE_TTL_MS, 10) || 600000, // 10 minutes

  // Client
  CLIENT_URL:            process.env.CLIENT_URL,

  // Derived
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV !== 'production',
});

module.exports = env;
