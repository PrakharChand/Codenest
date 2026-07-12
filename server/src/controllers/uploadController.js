/**
 * server/src/controllers/uploadController.js
 *
 * File upload flow — Cloudinary + DB.
 *
 * Upload ordering rule (locked in CODENEST_REFERENCE.md):
 *   1. Upload to Cloudinary FIRST — get the URL.
 *   2. Write the DB row SECOND with the confirmed URL.
 *   Never insert a row referencing an image that failed to upload.
 *   If the DB write fails after a successful upload, the orphaned
 *   Cloudinary image is harmless (unreferenced). The reverse order
 *   would leave a broken DB reference pointing at a non-existent image.
 *
 * Old-asset cleanup ordering:
 *   1. Update the DB row to the new URL first.
 *   2. Then delete the old Cloudinary asset (best-effort).
 *   A failed cleanup logs but does NOT fail the request.
 *
 * Identity note:
 *   NO upload route may touch anonymous_avatar_url.
 *   The anonymous avatar is the DiceBear default, permanently set at
 *   identity creation time. An uploaded image could leak identity.
 */

const cloudinary = require('../config/cloudinary');
const { query }  = require('../config/db');
const ApiError   = require('../utils/ApiError');

// ── POST /api/users/:id/avatar ────────────────────────────────────────────
// Protected + owner-only. Updates avatar_url (public identity only).

async function uploadAvatar(req, res) {
  const targetUserId = parseInt(req.params.id, 10);
  const requesterId  = req.user.id;

  if (targetUserId !== requesterId) {
    throw ApiError.forbidden('You can only update your own avatar.');
  }

  if (!req.file) {
    throw ApiError.badRequest('No image file provided.');
  }

  // Fetch current avatar_url to clean up old asset later
  const { rows } = await query('SELECT avatar_url FROM users WHERE id = $1', [targetUserId]);
  if (!rows.length) throw ApiError.notFound('User not found.');
  const oldAvatarUrl = rows[0].avatar_url;

  // 1. Upload to Cloudinary FIRST
  const uploadResult = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'codenest/avatars', resource_type: 'image' },
      (err, result) => {
        if (err) return reject(ApiError.badRequest('Image upload failed. Please try again.'));
        resolve(result);
      }
    ).end(req.file.buffer);
  });

  const newAvatarUrl = uploadResult.secure_url;

  // 2. Write DB row SECOND
  await query('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [newAvatarUrl, targetUserId]);

  // 3. Best-effort: delete old Cloudinary asset (only if it was a Cloudinary URL)
  if (oldAvatarUrl && oldAvatarUrl.includes('cloudinary.com')) {
    const publicId = extractCloudinaryPublicId(oldAvatarUrl);
    if (publicId) {
      cloudinary.uploader.destroy(publicId).catch((err) => {
        console.warn(`[upload] Failed to delete old avatar asset ${publicId}:`, err.message);
      });
    }
  }

  return res.json({ avatar_url: newAvatarUrl });
}

// ── POST /api/posts/upload-image ──────────────────────────────────────────
// Protected. Returns a Cloudinary URL the client includes in the Phase 3
// create-post call. Keeps Phase 3's create-post endpoint unchanged and
// upload concerns isolated. Client makes two calls: upload → create.

async function uploadPostImage(req, res) {
  if (!req.file) {
    throw ApiError.badRequest('No image file provided.');
  }

  const uploadResult = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'codenest/post-images', resource_type: 'image' },
      (err, result) => {
        if (err) return reject(ApiError.badRequest('Image upload failed. Please try again.'));
        resolve(result);
      }
    ).end(req.file.buffer);
  });

  return res.json({ image_url: uploadResult.secure_url });
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Extract the Cloudinary public_id from a secure URL.
 * e.g. "https://res.cloudinary.com/demo/image/upload/v1234/codenest/avatars/abc123.jpg"
 * → "codenest/avatars/abc123"
 */
function extractCloudinaryPublicId(url) {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

module.exports = { uploadAvatar, uploadPostImage };
