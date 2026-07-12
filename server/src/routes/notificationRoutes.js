/**
 * server/src/routes/notificationRoutes.js
 *
 * All /api/notifications routes behind requireAuth.
 * Note: /read-all must be defined BEFORE /:id/read so Express
 * matches the literal 'read-all' before treating it as an :id param.
 */

const express       = require('express');
const router        = express.Router();

const asyncHandler  = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { listNotifications, markOneRead, markAllRead } = require('../controllers/notificationController');

router.get('/',             requireAuth, asyncHandler(listNotifications));
router.put('/read-all',     requireAuth, asyncHandler(markAllRead));      // must be before /:id/read
router.put('/:id/read',     requireAuth, asyncHandler(markOneRead));

module.exports = router;
