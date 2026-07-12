/**
 * server/src/routes/uploadRoutes.js
 *
 * Upload routes — all behind requireAuth.
 * multer validates file type and size BEFORE the controller runs.
 */

const express       = require('express');
const router        = express.Router();

const asyncHandler  = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { singleImage } = require('../middleware/upload');
const { uploadAvatar, uploadPostImage } = require('../controllers/uploadController');

// Avatar upload — owner-only enforced in controller
router.post('/users/:id/avatar',    requireAuth, singleImage('avatar'),  asyncHandler(uploadAvatar));

// Post image upload — returns URL for the Phase 3 create-post call
router.post('/posts/upload-image',  requireAuth, singleImage('image'),   asyncHandler(uploadPostImage));

module.exports = router;
