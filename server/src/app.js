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
const statsRoutes        = require('./routes/statsRoutes');

const app = express();
app.set('trust proxy', 1);

// ── Core middleware ────────────────────────────────────────────────────────

/**
 * Pattern-based CORS — allows:
 *   • Any *.vercel.app URL  (production + all preview deployments)
 *   • https://codenest-sg3f.onrender.com  (Render self-origin / health checks)
 *   • http://localhost:*  (local development on any port)
 *   • Undefined / null origin  (curl, server-to-server, health checks)
 *
 * DO NOT use a wildcard (*) — that breaks credentials (httpOnly cookies).
 */
function isOriginAllowed(origin) {
  if (!origin) return true; // no-origin requests always allowed

  const clean = origin.replace(/\/$/, ''); // strip trailing slash

  // Any Vercel deployment URL (production + all auto-generated preview URLs)
  if (clean.endsWith('.vercel.app')) return true;

  // Render backend self-origin
  if (clean === 'https://codenest-sg3f.onrender.com') return true;

  // Local development — any localhost port
  if (clean.startsWith('http://localhost:') || clean === 'http://localhost') return true;
  if (clean.startsWith('http://127.0.0.1:') || clean === 'http://127.0.0.1') return true;

  // Optional CLIENT_URL env override
  if (env.CLIENT_URL && clean === env.CLIENT_URL.replace(/\/$/, '')) return true;

  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true, // Required for httpOnly refresh-token cookie cross-origin
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

app.use('/api/stats',         statsRoutes);           // Public stats
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

// Flagship AI Assistant (CodeNest Guide & Shadow Mentor)
const assistantRoutes = require('./routes/assistantRoutes');
app.use('/api/assistant', assistantRoutes);

// Phase 5
app.use('/api/notifications', notificationRoutes);   // notification bell
app.use('/api/upload',        uploadRoutes);        // /api/upload/users/:id/avatar, /api/upload/posts/upload-image
app.use('/api/ai',            aiRoutes);              // AI features (aiLimiter applied per-route)

// ── Terminal middleware (order is critical — must be last) ─────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
