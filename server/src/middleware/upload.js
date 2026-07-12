/**
 * server/src/middleware/upload.js
 *
 * Multer middleware for file uploads.
 *
 * Rules (all recorded in CODENEST_REFERENCE.md):
 *   - Memory storage: Render's filesystem is ephemeral; never write to disk.
 *   - Allowed MIME types: image/png, image/jpeg, image/webp ONLY.
 *   - Hard size cap: 5 MB (5 * 1024 * 1024 bytes).
 *   - Invalid type or oversized file → clean ApiError.badRequest before hitting Cloudinary.
 *
 * Identity note:
 *   Upload routes are public-identity only.
 *   No upload route may ever write anonymous_avatar_url.
 *   The anonymous avatar is the DiceBear default assigned at identity creation
 *   and is never user-uploadable (an uploaded image could leak identity).
 */

const multer   = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return callback(
        ApiError.badRequest('Invalid file type. Only PNG, JPEG, and WebP images are allowed.')
      );
    }
    callback(null, true);
  },
});

/**
 * singleImage('field')
 *
 * Returns a middleware that parses a single image from the named field.
 * Wraps multer's LIMIT_FILE_SIZE error into a clean ApiError.
 */
function singleImage(fieldName) {
  const middleware = upload.single(fieldName);
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(ApiError.badRequest('File is too large. Maximum size is 5 MB.'));
        }
        return next(err);
      }
      next();
    });
  };
}

module.exports = { singleImage };
