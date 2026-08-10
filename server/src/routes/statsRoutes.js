/**
 * server/src/routes/statsRoutes.js
 *
 * Public statistics routes mounted at /api/stats.
 */

const express      = require('express');
const router       = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { getPublicStats } = require('../controllers/statsController');

const metricsService = require('../services/metricsService');

// GET /api/stats/public or GET /api/stats
router.get('/public', asyncHandler(getPublicStats));
router.get('/',       asyncHandler(getPublicStats));

// GET /api/stats/metrics — Real-time server observability metrics
router.get('/metrics', (_req, res) => {
  res.json(metricsService.getMetrics());
});

module.exports = router;
