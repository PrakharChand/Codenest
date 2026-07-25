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
const authRoutes     = require('./routes/authRoutes');
const postRoutes     = require('./routes/postRoutes');
const { nestedRouter: commentNestedRouter, flatRouter: commentFlatRouter } = require('./routes/commentRoutes');
const userRoutes     = require('./routes/userRoutes');
const communityRoutes = require('./routes/communityRoutes');

const { requireAuth, requireAnonymousIdentity } = require('./middleware/auth');
const shadowRoutes   = require('./routes/shadowRoutes');

// Phase 5 imports
const passport           = require('./config/passport'); // registers strategies
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes       = require('./routes/uploadRoutes');
const aiRoutes           = require('./routes/aiRoutes');

const app = express();
app.set('trust proxy', 1);

// ── Core middleware ────────────────────────────────────────────────────────

const allowedOrigins = [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || (!env.IS_PRODUCTION && origin.startsWith('http://localhost:'))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,              // Required for httpOnly cookie cross-origin
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());          // Required to read req.cookies (refresh token)

// Passport — stateless mode (session: false on each route).
// initialize() is required; session() is deliberately NOT used (JWT, no server sessions).
app.use(passport.initialize());

// Global rate limiter — individual routes apply stricter authLimiter/aiLimiter
app.use(generalLimiter);

// ── Health check ──────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────────────────

app.use('/api/auth',          authRoutes);            // Phase 2 + Phase 5 OAuth
app.use('/api/posts',         postRoutes);            // Phase 3
app.use('/api/posts/:postId/comments', commentNestedRouter); // Phase 3: GET/POST /api/posts/:postId/comments
app.use('/api/comments',      commentFlatRouter);     // Phase 3: DELETE /api/comments/:commentId
app.use('/api/users',         userRoutes);            // Phase 3: connections
app.use('/api/communities',   communityRoutes);       // Phase 3

// Phase 4 — Shadow: Group-level guard (Identity Rule 4).
// BOTH requireAuth AND requireAnonymousIdentity applied at the mount point,
// not per-route. Structurally impossible to add a shadow route that forgets the guard.
app.use('/api/shadow',        requireAuth, requireAnonymousIdentity, shadowRoutes);

// Phase 5
app.use('/api/notifications', notificationRoutes);   // notification bell
app.use('/api',               uploadRoutes);          // /api/users/:id/avatar, /api/posts/upload-image
app.use('/api/ai',            aiRoutes);              // AI features (aiLimiter applied per-route)

// ── Terminal middleware (order is critical — must be last) ─────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
