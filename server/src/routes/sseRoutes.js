/**
 * server/src/routes/sseRoutes.js
 * 
 * Server-Sent Events HTTP streaming endpoint for CodeNest.
 * Connects clients to real-time notification events.
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const sseService = require('../services/sseService');

router.get('/stream', requireAuth, (req, res) => {
  sseService.registerClient(req.user.id, res);
});

module.exports = router;
