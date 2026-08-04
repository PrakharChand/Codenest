/**
 * server/src/routes/statsRoutes.js
 *
 * Public statistics routes mounted at /api/stats.
 */

const express      = require('express');
const router       = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { getPublicStats } = require('../controllers/statsController');

// GET /api/stats/public or GET /api/stats
router.get('/public', asyncHandler(getPublicStats));
router.get('/',       asyncHandler(getPublicStats));

module.exports = router;
