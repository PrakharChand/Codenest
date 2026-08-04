/**
 * server/src/routes/userRoutes.js
 *
 * User-related routes mounted at /api/users.
 *
 * Discovery:
 *   GET    /api/users/search?q=...               — search by name
 *   GET    /api/users/explore                    — paginated all-users for discovery
 *   GET    /api/users/:id                        — single public profile
 *
 * Follow / Unfollow (one-tap, no approval):
 *   POST   /api/users/:id/connect                — follow a user
 *   DELETE /api/users/:id/connect                — unfollow
 *   GET    /api/users/:id/connections            — paginated list of users userId follows
 *   GET    /api/users/:id/followers             — paginated list of users who follow userId
 *   GET    /api/users/:id/mutual               — paginated mutual connections (both directions)
 *
 * Connection Requests (symmetric, approval-based):
 *   POST   /api/users/:id/request                — send a request
 *   POST   /api/users/:id/request/accept         — accept incoming request
 *   POST   /api/users/:id/request/decline        — decline incoming request
 *   GET    /api/users/me/requests/incoming       — list pending received requests
 *   GET    /api/users/me/requests/outgoing       — list pending sent requests
 *
 * Profile / Onboarding:
 *   PUT    /api/users/:id                        — update own profile
 *   POST   /api/users/me/onboarding/complete     — mark onboarding done
 */

const express         = require('express');
const router          = express.Router();

const asyncHandler    = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const { completeOnboarding } = require('../controllers/authController');
const { connect, disconnect, listConnections, listFollowers, listMutual } = require('../controllers/connectionController');
const { searchUsers, exploreUsers, getUserProfile, updateProfile, deleteAccount, getUserActivity } = require('../controllers/userController');
const {
  sendRequest,
  acceptRequest,
  declineRequest,
  incomingRequests,
  outgoingRequests,
} = require('../controllers/connectionRequestController');

// ── Static / me routes (must come before /:id to avoid param shadowing) ──

router.get('/search',                              asyncHandler(searchUsers));
router.get('/explore',                             asyncHandler(exploreUsers));
router.post('/me/onboarding/complete', requireAuth, asyncHandler(completeOnboarding));
router.get('/me/requests/incoming',    requireAuth, asyncHandler(incomingRequests));
router.get('/me/requests/outgoing',    requireAuth, asyncHandler(outgoingRequests));
router.get('/me/activity',             requireAuth, asyncHandler(getUserActivity));
router.delete('/me',                   requireAuth, asyncHandler(deleteAccount));

// ── Parameterised user routes ─────────────────────────────────────────────

router.get('/:id',             asyncHandler(getUserProfile));
router.put('/:id', requireAuth, asyncHandler(updateProfile));
router.delete('/:id', requireAuth, asyncHandler(deleteAccount));

// Follow / Unfollow
router.post('/:id/connect',    requireAuth, asyncHandler(connect));
router.delete('/:id/connect',  requireAuth, asyncHandler(disconnect));
router.get('/:id/connections',             asyncHandler(listConnections));
router.get('/:id/followers',               asyncHandler(listFollowers));
router.get('/:id/mutual',                  asyncHandler(listMutual));

// Connection Requests
router.post('/:id/request',          requireAuth, asyncHandler(sendRequest));
router.post('/:id/request/accept',   requireAuth, asyncHandler(acceptRequest));
router.post('/:id/request/decline',  requireAuth, asyncHandler(declineRequest));

module.exports = router;
