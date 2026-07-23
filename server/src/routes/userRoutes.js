/**
 * server/src/routes/userRoutes.js
 *
 * User-related routes mounted at /api/users:
 *   POST   /api/users/:id/connect        — follow
 *   DELETE /api/users/:id/connect        — unfollow
 *   GET    /api/users/:id/connections    — paginated connections list (auth optional)
 */

const express         = require('express');
const router          = express.Router();

const asyncHandler    = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { connect, disconnect, listConnections } = require('../controllers/connectionController');
const { completeOnboarding } = require('../controllers/authController');

router.post('/me/onboarding/complete', requireAuth, asyncHandler(completeOnboarding));
router.post('/:id/connect',    requireAuth, asyncHandler(connect));
router.delete('/:id/connect',  requireAuth, asyncHandler(disconnect));
router.get('/:id/connections',             asyncHandler(listConnections));

module.exports = router;
