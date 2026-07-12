/**
 * server/src/config/cloudinary.js
 *
 * Cloudinary SDK client — reads keys from env.js (never process.env directly).
 * Convention from Phase 2: no file reads process.env directly; they import env.js.
 */

const cloudinary = require('cloudinary').v2;
const env        = require('./env');

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key:    env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
