/**
 * server/src/app.js
 *
 * Express application — middleware, routes, and terminal handlers.
 * Import order matters:
 *   core middleware → routes → notFound → errorHandler (must be last)
 *
 * Note on cookie-parser: added in Phase 2 to support the httpOnly refresh
 * token cookie strategy. This is a direct requirement of the locked auth
 * convention (access token in body, refresh token in httpOnly cookie).
 */

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const env          = require('./config/env'); // validates required vars at boot

const { generalLimiter } = require('./middleware/rateLimit');
const notFound       = require('./middleware/notFound');
const errorHandler   = require('./middleware/errorHandler');
const authRoutes      = require('./routes/authRoutes');
const postRoutes      = require('./routes/postRoutes');
const { nestedRouter: commentNestedRouter, flatRouter: commentFlatRouter } = require('./routes/commentRoutes');
const userRoutes      = require('./routes/userRoutes');
const communityRoutes = require('./routes/communityRoutes');

const app = express();

// ── Core middleware ────────────────────────────────────────────────────────

app.use(cors({
  origin:      env.CLIENT_URL,
  credentials: true,              // Required for httpOnly cookie to be sent cross-origin
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());          // Required to read req.cookies (refresh token)

// Global rate limiter — individual routes apply stricter authLimiter
app.use(generalLimiter);

// ── Health check ──────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────────────────

app.use('/api/auth',        authRoutes);                        // Phase 2
app.use('/api/posts',       postRoutes);                        // Phase 3
app.use('/api/posts',       commentNestedRouter);               // Phase 3: GET/POST /api/posts/:id/comments
app.use('/api/comments',    commentFlatRouter);                 // Phase 3: DELETE /api/comments/:commentId
app.use('/api/users',       userRoutes);                        // Phase 3: connections
app.use('/api/communities', communityRoutes);                   // Phase 3

// Phase 4: app.use('/api/shadow', shadowRoutes);
// Phase 5: app.use('/api/notifications', notificationRoutes);
// Phase 5: app.use('/api/upload', uploadRoutes);
// Phase 5: app.use('/api/ai', aiRoutes);

// ── Terminal middleware (order is critical) ───────────────────────────────
// 1. notFound — catch all unmatched routes → ApiError 404
// 2. errorHandler — convert any error to the locked JSON shape
// These MUST be last.

app.use(notFound);
app.use(errorHandler);

module.exports = app;
