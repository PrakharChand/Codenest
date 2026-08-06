# CODENEST_REFERENCE.md

> **Every phase reads this file first before writing a single line of code.**
> It is the authoritative source for identity rules, conventions, stack, and build order.
> After each phase completes, append a one-line note to the Phase Log at the bottom.

---

## 1. Project Summary

CodeNest is a **dual-identity developer platform**. Every user has **ONE account** with **TWO identities**:

| Identity | Surface | Visibility |
|---|---|---|
| **Public** | Nest Feed (social/learning) | Real name, avatar, bio, GitHub/Twitter links |
| **Anonymous** | Nest Shadow (bias-free code review) | Permanent anonymous username only |

Both identities live in the **same row** of the `users` table. The separation is a **security boundary** enforced at the database-query level and the API-route level — **never only on the frontend**.

---

## 2. Locked Tech Stack

> Do not add dependencies without stating the reason and pausing for confirmation.

### Frontend (client/)

| Package | Purpose |
|---|---|
| React + Vite | UI framework + dev server |
| React Router DOM | Client-side routing |
| Axios | All HTTP — centralized in `src/api/axios.js` |
| Tailwind CSS | All styling |
| React Context API | Global state (AuthContext) |
| @uiw/react-md-editor | Markdown editor |
| Recharts | Data visualization |
| React Hot Toast | Notifications |
| date-fns | Date formatting |
| Socket.io-client | Real-time events |

### Backend (server/)

| Package | Purpose |
|---|---|
| Node.js + Express.js | HTTP server + routing |
| Socket.io | Real-time |
| jsonwebtoken | JWT access + refresh tokens |
| bcryptjs | Password hashing |
| pg | PostgreSQL client (Pool) |
| cors | Cross-origin |
| dotenv | Env variable loading |
| multer | File upload handling |
| express-rate-limit | Rate limiting |
| express-validator | Request validation |
| Passport.js | OAuth (passport-github2 + passport-google-oauth20) |
| node-cron | Scheduled jobs |
| cloudinary | File storage |
| @anthropic-ai/sdk | Claude AI integration |

### Infrastructure

| Service | Role |
|---|---|
| PostgreSQL (Supabase) | Primary database |
| Cloudinary | File storage |
| Vercel | Frontend hosting |
| Render | Backend hosting |

---

## 3. The 6 Identity Rules

> Non-negotiable. Any violation in a Shadow route is a **critical security bug** and takes priority over all other work.

### Rule 1 — One row, two identities

Both identities live in the same `users` row.

**Public fields:** `id`, `name`, `email`, `password_hash`, `avatar_url`, `bio`, `github_url`, `twitter_url`, `created_at`, `updated_at`

**Anonymous fields:** `anonymous_username`, `anonymous_avatar_url`, `anonymous_reputation_score`, `has_anonymous_identity`

### Rule 2 — SQL-level field exclusion on Shadow routes

Any endpoint under `/api/shadow/` must **NEVER** return `name`, `email`, `password_hash`, `avatar_url`, `bio`, `github_url`, or `twitter_url`.

These fields must be **excluded at the SQL query level** (explicit column lists — never `SELECT *`), **not** filtered afterward in JavaScript.

The only permitted formatter for Shadow responses is `src/utils/shadowSerializer.js`.

### Rule 3 — Anonymous username is permanent

The anonymous username is **generated once** via a three-dropdown flow (adjective + animal + number) and **cannot be changed** after creation.

### Rule 4 — Mode is determined by route group, not by a flag

- `/api/shadow/` → Shadow mode (anonymous identity)
- Everything else → Feed mode (public identity)

A body flag is **never** the source of truth.

### Rule 5 — Self-review is impossible

A user can never review their own Shadow submission — enforced **at the query level** by excluding rows where `user_id = current_user_id`.

### Rule 6 — Identity leak = critical bug

Any accidental exposure of real identity in a Shadow route is a **critical security bug** and takes priority over all other work.

---

## 4. Conventions

### Folder Responsibilities

| Folder | Responsibility |
|---|---|
| `routes/` | URL definitions + middleware chains only. No business logic. |
| `controllers/` | Business logic only. No raw SQL — call query helpers. |
| `middleware/` | Cross-cutting: auth, validation, rate limiting, error handling. |
| `db/` | Migrations, seed data, query helper functions. |
| `utils/` | Pure helpers and serializers. `shadowSerializer.js` lives here. |
| `config/` | External service connections: db.js, cloudinary.js, passport.js. |

### Error Handling

- Every controller is wrapped in `try/catch`.
- All errors normalize to: `{ "error": { "code": "SNAKE_CASE_CODE", "message": "Human readable.", "field": "optional" } }`
- Use `AppError` from `utils/AppError.js` for predictable 4xx errors.
- Unknown errors fall through to the global handler in `app.js`.

### Shadow Serialization

- All Shadow query results pass through `shadowSerializer.js` before responding.
- No Shadow route may ever `res.json(rawDbRow)` directly.

### Frontend Patterns

- All HTTP calls go through `client/src/api/axios.js` — never raw `fetch`.
- A single `AuthContext` holds `{ user, mode, accessToken, login, logout, switchMode }`.
- Tailwind only — no inline styles, no CSS modules.
- Two themes toggled by a root CSS class (`dark` on `<html>`).

### Anonymous Username Generation

Three-dropdown adjective-animal-number flow. Lists defined in Phase 1 seed data.

---

## 8. Auth Conventions

> Established in Phase 2. These values must be consistent across all phases, especially Phase 7 (Axios layer) and Phase 11 (wiring).

### Token Strategy

| Token | Lifetime | Storage | Secret |
|---|---|---|---|
| Access token | 15 minutes (`JWT_ACCESS_EXPIRES_IN`) | JSON response body → `AuthContext` memory (never localStorage) | `JWT_ACCESS_SECRET` |
| Refresh token | 7 days (`JWT_REFRESH_EXPIRES_IN`) | httpOnly + Secure + SameSite cookie named `refreshToken` | `JWT_REFRESH_SECRET` |

**Why httpOnly cookie for refresh token:** A refresh token readable by JavaScript is the highest-value target for XSS attacks. Keeping it in an httpOnly cookie means JavaScript can never access it, even if the page is compromised.

**Phase 7 implication:** The Axios instance in `client/src/api/axios.js` attaches the access token from memory (`AuthContext`). It does NOT manage the refresh cookie — that is sent automatically by the browser.

**Phase 11 implication:** The `/api/auth/refresh` endpoint reads `req.cookies.refreshToken` — the cookie is sent automatically by the browser on every request to `/api/auth`.

### bcrypt Salt Rounds

**12 rounds.** Chosen to be slow enough to resist brute-force on stolen hashes while staying fast enough for login UX (< 500ms on typical hardware).

### Cookie-parser

`cookie-parser` was added in Phase 2 as a direct requirement of the httpOnly cookie strategy. It is documented here because it was not in the original locked stack list — this is the one transparent addition.

---

## 7. Phase Log

> Append a one-line note here after every phase completes. Never delete entries.

- **Phase 0** — Foundation complete: monorepo scaffolded, .gitignore, .env.example, 6 identity rules, conventions, and route table committed. Awaiting Phase 1.
- **Phase 1** — Database complete: 18 migrations (001–018), 16 feature tables + 2 lookup tables (anon_adjectives, anon_animals), migrate.js runner, seed.js (idempotent), verify.js constraint checker. Awaiting DB credentials from user to run live verification.
- **Phase 2** — Backend core complete: env.js (boot validation), ApiError, asyncHandler, errorHandler (Postgres error translation), notFound, validate, rateLimit (authLimiter/generalLimiter/aiLimiter), tokens.js (access+refresh+cookie helpers), requireAuth + requireAnonymousIdentity middleware, shadowSerializer (Rule 2 enforced), authController (register/login/refresh/logout/me/anonymousOptions/anonymousCreate), authRoutes, app.js wired. 11/11 tests pass. cookie-parser added (documented above).

---

## 9. API Conventions (Phase 3)

### Pagination

Every list endpoint uses `utils/paginate.js`. No route hand-rolls pagination.

- Query params: `?page` (default 1), `?limit` (default 20, **hard max 50 — clamped**, never trust client)
- Response envelope (identical on every list endpoint):
  ```json
  { "data": [...], "pagination": { "page", "limit", "total", "totalPages", "hasNext" } }
  ```

### Ownership

For any edit/delete of a user-owned resource: ownership is checked at the **query level** (`WHERE id = $1 AND user_id = $2`). Zero rows affected → `ApiError.forbidden`. Never fetch-then-compare in JS — the database is the gate.

### Counter integrity

Counter + row mutations are **always transactional** via `utils/withTransaction.js`. `GREATEST(counter - 1, 0)` guards every decrement — counters never go negative.

### Duplicate actions

**Duplicate like / join / connect = idempotent success** (not 409). A double-tap feels harmless on the frontend and causes no data inconsistency. This is the project-wide convention — Phase 4 mirrors it.

### Content limits

| Field | Max length |
|---|---|
| Post title | 200 characters |
| Post content | 50,000 characters |
| Comment content | 5,000 characters |
| Community name | 100 characters |
| Community description | 1,000 characters |
| Tag name | 50 characters |

### Mutual connections

"Mutual" = both directions of a connection exist: `(follower_id=A, following_id=B)` AND `(follower_id=B, following_id=A)`. Computed in SQL via EXISTS subquery — no second round-trip.

### Schema evolution

Migration 019 (`019_post_shares.sql`) added `shared_from_post_id` to `posts` in Phase 3. Reason: the share relationship became concrete only when building the share endpoint. Editing already-applied migrations would break `_migrations` idempotency — new numbered migrations are the traceable way to evolve a live schema.

Migration 020 (`020_shadow_reviews_unique.sql`) added a partial unique index on `(submission_id, reviewer_id) WHERE reviewer_id IS NOT NULL` in Phase 4. Reason: the race-condition risk (two tabs submitting reviews simultaneously) became concrete when building the review endpoint. The partial index allows Phase 5 AI reviews (`reviewer_id = NULL`) without a schema change.

---

## 10. Shadow Boundary (Phase 4)

### Group Guard

The entire `/api/shadow/` router is mounted in `app.js` behind **both** `requireAuth` **and** `requireAnonymousIdentity` at the mount point — not per-route. This makes it structurally impossible to add a Shadow route that forgets the guard. Identity Rule 4 (mode = route group) is architectural, not optional.

### SQL Column Rule

Every `SELECT` in shadow controllers uses an **explicit anonymous-only column list**. No `SELECT *`. No selecting `u.name`/`u.email`/`u.avatar_url`. The real `user_id` may appear in `WHERE`/`JOIN` conditions (for ownership and self-exclusion) but **never in any SELECT list or response object**.

### Ownership-Branch Reveal Rule

`GET /api/shadow/submissions/:id` branches on ownership at the query level:
- **Owner** → full detail + reviewer `anonymous_username` (Review Reveal)
- **Non-owner** → content visible for reviewing, reviewer usernames withheld
- **Submitter's identity** → never revealed to anyone

### Review Immutability

A review is immutable once posted — no edit/delete endpoint exists. Reviews are permanent feedback.

### Reputation Definition

Reputation (`users.anonymous_reputation_score`) is a **stored running total** incremented transactionally at helpful-vote time — NOT recomputed on read. A helpful vote moves three things in one transaction:
1. Insert `shadow_helpful_votes` row (composite PK dedupes)
2. Increment `shadow_reviews.helpful_vote_count`
3. Increment `users.anonymous_reputation_score` for the review author

### Shadow Content Limits

| Field | Max length |
|---|---|
| Submission title | 200 characters |
| Submission content | 100,000 characters |
| Submission question | 2,000 characters |
| Language tag | 50 characters |
| Shadow community post | 50,000 characters |

### Queue Content Truncation

Queue items show only the first 300 characters of submission content (truncated server-side).


## 5. Route Groups and Build Order

| # | Route Prefix | Phase |

|---|---|---|
| 1 | POST /api/auth/register, login, refresh, logout | Phase 2 |
| 2 | POST /api/identity/shadow (create anonymous identity) | Phase 2 |
| 3 | GET/PUT /api/users/:id (public profile) | Phase 2 |
| 4 | GET/POST /api/feed/posts, /posts/:id | Phase 3 |
| 5 | GET/POST /api/feed/posts/:id/comments | Phase 3 |
| 6 | POST/DELETE /api/feed/posts/:id/likes | Phase 3 |
| 7 | POST/DELETE /api/connections/:targetId | Phase 3 |
| 8 | GET/POST /api/communities, /communities/:id/posts | Phase 3 |
| 9 | GET/POST /api/shadow/submissions, /submissions/:id | Phase 4 |
| 10 | GET/POST /api/shadow/submissions/:id/reviews | Phase 4 |
| 11 | POST /api/shadow/submissions/:id/vote | Phase 4 |
| 12 | GET /api/notifications, PUT /api/notifications/:id/read | Phase 5 |
| 13 | POST /api/upload (Cloudinary via multer) | Phase 5 |
| 14 | GET /api/auth/github, /github/callback, /google, /google/callback | Phase 5 |
| 15 | POST /api/ai/review, /api/ai/suggest | Phase 5 |

---

## 6. Full Build Order

| Phase | Description |
|---|---|
| **0** | Foundation: repo structure, conventions, this reference file, env setup |
| **1** | Database: schema, migrations, verification |
| **2** | Backend core: auth (JWT + refresh), identity creation, middleware |
| **3** | Backend Nest Feed: posts, comments, likes, connections, communities |
| **4** | Backend Nest Shadow: submissions, reviews, voting, reputation |
| **5** | Backend support: notifications, file uploads, OAuth, AI routes |
| **6** | Backend full test pass (before any frontend) |
| **7** | Frontend foundation: design system, theme tokens, routing, AuthContext |
| **8** | Frontend Nest Feed pages |
| **9** | Frontend Nest Shadow pages + mode-switch |
| **10** | Onboarding: dismissable first-login walkthrough + persistent navbar help menu |
| **11** | Frontend to backend wiring + real-time |
| **12** | Full end-to-end test + deployment |

---

## 7. Phase Log

> Append a one-line note here after every phase completes. Never delete entries.

- **Phase 0** — Foundation complete: monorepo scaffolded, .gitignore, .env.example, 6 identity rules, conventions, and route table committed. Awaiting Phase 1.
- **Phase 1** — Database complete: 18 migrations (001–018), 16 feature tables + 2 lookup tables (anon_adjectives, anon_animals), migrate.js runner, seed.js (idempotent), verify.js constraint checker. Awaiting DB credentials from user to run live verification.
- **Phase 2** — Backend core complete: env.js, ApiError, asyncHandler, errorHandler, notFound, validate, rateLimit, tokens.js, requireAuth + requireAnonymousIdentity, shadowSerializer, authController (7 endpoints), authRoutes. 11/11 tests pass.
- **Phase 3** — Nest Feed backend complete: posts CRUD + like/unlike/share, comments CRUD, connections (follow/unfollow/list + mutual), communities (create/join/leave/post). paginate.js, withTransaction.js. Migration 019 added shared_from_post_id. API conventions locked (pagination, ownership, counters, duplicate-idempotency). 25/25 tests pass.
- **Phase 4** — Nest Shadow backend complete: submissions (create/queue/mine/detail), structured reviews (DB-level dedupe via migration 020), helpful voting + transactional 3-way reputation, anonymous community, shadow profile. Group-level Shadow guard (requireAuth + requireAnonymousIdentity at mount point). Identity leak sweep passing on all 6 response shapes. 46/46 tests pass.
- **Phase 5** — Backend support complete: notifications (emitted inside existing transactions from Feed/Shadow actions), Cloudinary uploads (public-identity only, memory storage, 5MB/PNG/JPEG/WebP), OAuth GitHub+Google (email-linking, same token spec as Phase 2, stateless Passport), AI routes (suggest-tags, anonymity-check, generate-roadmap, suggest-connections — all with 10s timeout + fail-open fallback), migration 021 (user_roadmaps), hourly AI-review cron (reviewer_id=NULL, partial-index forward-reservation pays off). Backend now feature-complete. 77/77 tests pass.
- **Phase 6** — Backend full test pass complete: readiness score 100/100, 290/290 tests passing across all suites (static audit, leak sweep, cross-feature integration, robustness error handling, unit tests). Comment route mounting bug fixed. Backend is feature-complete, verified, and gate passed. Ready for Phase 7 frontend.
- **Phase 7** — Frontend foundation complete: design bridge (`client/DESIGN_REFERENCE.md`), two-theme semantic tokens (`.theme-feed` & `.theme-shadow`), ThemeContext $\leftrightarrow$ mode link, centralized Axios with single-flight refresh queue, AuthContext (locked shape) + `useAuth`, lazy router with `PublicRoute`, `ProtectedRoute`, and `ShadowRoute` guards, atomic component library (Button, Input, TextArea, Avatar, Badge, Card, Modal, Dropdown, Spinner, Skeleton, EmptyState, Navbar, AppShell), a11y focus + motion baseline; matches backend contracts; 100/100 verified. Ready for Phase 8.
- **Phase 8** — Nest Feed frontend complete: 9 public pages (Landing, Login, Register, OAuthCallback, Feed, PostDetail, CreatePost, EditPost, UserProfile, EditProfile, Communities, CommunityDetail, Notifications, Connections), shared organisms (PostCard, CommentThread, UserCard, CommunityCard, PaginatedList, MarkdownEditor, MarkdownView), 6 per-resource API modules (`authApi`, `postsApi`, `commentsApi`, `usersApi`, `communitiesApi`, `notificationsApi`). Paginated lists, field-level error validation, image upload, OAuth buttons, feed theme tokens only. 100/100 verified. Ready for Phase 9.
- **Phase 9** — Nest Shadow frontend & mode switch complete: 6 anonymous pages (ShadowQueue, ShadowSubmissionDetail, CreateSubmission, MySubmissions, ShadowProfile, ShadowCommunity), AnonymousCreatePage (3-dropdown permanence flow, live preview, 409 handle collision handling), isolated `shadowApi.js`, threshold-crossing mode switch toggle with dynamic ARIA labels & theme-shadow tokens (`.theme-shadow` + `.dark`), Review Reveal owner branching, AI review labels & de-emphasis, zero-username queue contract verified; 100/100 verified. Ready for Phase 10.
- **Phase 10** — Onboarding complete: DB-backed first-login dual-identity walkthrough (`OnboardingWalkthrough.jsx`) via migration 022 + `onboarding_completed_at` endpoints; persistent navbar help menu (`HelpMenu.jsx`) across both themes and navbars; 0 localStorage used; leak sweep re-confirmed; 100/100 verified. Ready for Phase 11.
- **Phase 11** — Real-time & wiring complete: Socket.io 1-to-1 notifications via JWT handshake auth (`socketAuth.js`), per-owner `user:{id}` rooms (server-internal, no shared Shadow room), emit-after-commit from `createNotification`, two separate live bells (`identity_context`), graceful degradation + reconnect re-sync (`NotificationContext.jsx`), socket Shadow payloads leak-swept clean; final wiring sweep done; AI slots deferred to Phase 12; 100/100 verified. Ready for Phase 12.
- **Phase 12** — AI Feature Wiring, E2E Test & Deployment complete: all 5 AI features active (smart tag suggestions, pre-submit anonymity guard, personalized learning roadmap with feed share, developer connection suggestions, hourly AI auto-reviews), isolated `aiApi.js` with fail-open fallbacks, full end-to-end suite passing (299/299 tests green), zero-leak whole-app security verified, production deployment guide configured (Vercel + Render + Supabase); readiness 100/100. PROJECT COMPLETE.
- **Phase 13** — Communication, Custom Shadow Communities & System Theme Engine complete:
  - Real-time 1-to-1 Live Chat for Nest Feed (`chatController.js`, `chatRoutes.js`, `chatApi.js`, `ChatPage.jsx`) restricted to mutual connections, with message edit/delete, thread deletion, seen/delivered indicators (`✓`/`✓✓`), and tagged notifications (`💬 Message from [Name]`).
  - Nest Shadow Anonymous Custom Communities (`shadowCommunityController.js`, `ShadowCommunityPage.jsx`, `ShadowCommunityDetailPage.jsx`) with anonymous posts and custom community creation.
  - Automatic System Theme Detection & Persistence Engine (`ThemeContext.jsx`) with `prefers-color-scheme: dark` OS auto-switch, zero-flicker `<head>` pre-render script, and localStorage override protection.
  - Migrations 034–038 added (shadow communities, chat conversations, chat messages, chat message edits, notification check constraint expansion).
  - 100/100 verified across all surfaces.

---

## 8. Realtime Architecture & Security Rules

- **Socket Authentication**: Sockets authenticate via JWT access token during handshake (`socketAuth.js`) reusing `verifyAccessToken`. Unauthenticated connections are rejected immediately.
- **Room Naming & Boundary Security**:
  - Each connected socket joins a single private room: `user:${userId}`.
  - Rooms are strictly 1-to-1 per owner and server-internal (room names are never sent to clients).
  - There are NO shared or broadcast Shadow rooms, preventing cross-user presence or identity leaks.
  - Notifications are delivered 1-to-1 to the recipient's private room.
- **Payload Sanitization**: Shadow notifications (`identity_context === 'shadow'`) emitted over sockets strictly exclude all real-identity fields (`name`, `email`, `avatar_url`, `bio`, `password_hash`, `github_url`, `twitter_url`).
- **Graceful Degradation**: If Socket.io fails to connect, the client falls back seamlessly to REST loading on navigation without throwing errors or breaking UI. Reconnecting re-synchronizes unread notification counts.

## 11. Phase 5 Conventions

### Notification Identity Rule

A Shadow-context notification must **never** contain real-identity text.
- Wrong: `"Alice reviewed your code"`
- Right: `"Your submission received a new review."`

The message string is the caller's responsibility at write time. The `createNotification` helper does not validate this — convention is enforced by code review and the Phase 5 test suite (`Shadow notification — identity rule`).

### Notification Architecture

`createNotification({ userId, type, message, referenceId, identityContext, client })` accepts an optional `client` (pg PoolClient). When passed a client, the notification INSERT runs inside the caller's transaction — it is never created for a rolled-back action. When no client is passed, it runs as a standalone query.

Decision: helpful votes (shadow) do **not** emit notifications — too noisy.

### Upload Ordering Rule

1. Upload to Cloudinary **first** — get the URL.
2. Write the DB row **second** with the confirmed URL.

Never insert a DB row referencing an image that failed to upload. A failed DB write after a successful upload leaves a harmless orphaned Cloudinary image. The reverse order would leave a broken DB reference.

Old-asset cleanup: **update DB first, then best-effort delete old Cloudinary asset**. A failed cleanup logs but does not fail the request.

### Upload Identity Restriction

Avatar upload is a **public-identity action only**. No upload route may touch `anonymous_avatar_url`. The anonymous avatar is the DiceBear default assigned at identity-creation time. An uploaded image could leak identity (same image used elsewhere).

Upload size cap: **5 MB**. Allowed types: `image/png`, `image/jpeg`, `image/webp`.

### OAuth Account-Linking Precedence (canonical rule)

Email is the identity key. On OAuth callback:
1. Email matches existing user → **link** (log into existing account). Handles "registered with email/password, later clicks OAuth on same email".
2. No user with that email → **create** new user (`password_hash = NULL`, `has_anonymous_identity = FALSE`).
3. **Never** create two rows for one email.
4. Provider returns no email → **fail clean** with a message to make email public or use email/password. Never invent a placeholder email.

### OAuth Token Handoff (canonical rule — Phase 7/11 must match)

On successful OAuth callback:
1. Issue access token (same JWT spec: `{ sub: userId }`, 15m, `JWT_ACCESS_SECRET`).
2. Set refresh token as httpOnly cookie (same cookie spec as Phase 2).
3. Redirect to `CLIENT_URL/oauth-callback?token=<accessToken>`.

Phase 7/11: read the `token` query param, store it in AuthContext memory, immediately remove it from the URL. **Refresh token must never appear in the URL.**

### AI Service Contract (all five features)

- **10-second timeout**: `AbortController`, cleared on success.
- **Safe fallback on any failure**: API down, timeout, parse error → fallback returned, surrounding action continues. A failed AI call must never 500 the user.
- **JSON-only response**: every prompt instructs Claude to return only a JSON object (no prose, no markdown wrapper). Response is parsed defensively; parse failure → fallback.
- **`aiLimiter`**: 20 requests/hour/IP, applied at the route level on every AI route.
- **Model**: `claude-sonnet-4-6`

| Feature | Fallback |
|---|---|
| `suggest-tags` | `{ tags: [] }` |
| `anonymity-check` | `{ safe: true, findings: [] }` (fail-open — AI down never blocks a submission) |
| `generate-roadmap` | `null` → 503 (no partial DB write) |
| `suggest-connections` | `{ suggestions: [] }` |
| `generate-ai-review` (cron) | `null` → skip this submission this run |

### AI Review Cron

- Schedule: hourly (`0 * * * *`).
- Started in `server.js` guarded by `NODE_ENV !== 'test'` — never runs during the test suite.
- Eligible: `review_count = 0 AND created_at < NOW() - INTERVAL '24 hours'`.
- Insert: `is_ai_review = TRUE`, `reviewer_id = NULL` (partial-unique index from migration 020 permits this — the Phase 4 forward-reservation pays off here with zero schema change).
- Transaction: insert + `review_count++` + identity-free Shadow notification in one `withTransaction`.
- Frontend: AI reviews are labeled and de-emphasized. The backend only marks `is_ai_review`.

### Roadmap Storage

One row per user (`UNIQUE(user_id)` on `user_roadmaps`). A regenerate UPSERTs — overwrites the previous roadmap. No versioning in Phase 5 scope.

---

## 12. Readiness Rubric (Phase 6)

> Defined in Phase 6 and reused by all subsequent phases. Every phase that prints a readiness score uses this rubric verbatim.

### Scoring (out of 100)

| Category | Points | What it measures |
|---|---|---|
| **Identity safety** | 35 | Leak sweep passes on every Shadow endpoint; no route returns a forbidden real-identity column; Shadow notifications carry no identity text. |
| **Correctness** | 25 | Every endpoint returns the documented shape and status codes; counters never drift from their rows; ownership and self-exclusion rules hold. |
| **Robustness** | 15 | Every error path returns `{ error: { code, message, field? } }`; no route emits raw stack/SQL/Postgres text; AI fallbacks fire on failure. |
| **Consistency** | 15 | Pagination envelope identical everywhere; every controller wrapped in `asyncHandler`; every protected route behind `requireAuth`; every Shadow route behind the group guard; no `SELECT *` anywhere. |
| **Test coverage of critical paths** | 10 | Auth, identity creation, Shadow leak sweep, duplicate-review/vote prevention, transactional counters, and OAuth email-linking all have passing automated tests. |

### Hard Rules

- **Identity leak hard cap:** Any single identity leak in a Shadow endpoint caps the **entire** phase score at 60, regardless of all other categories. (This implements Rule 6: identity leakage outranks all other work.)
- **Raw error leak:** Any endpoint that returns a raw stack trace, SQL text, or Postgres constraint name to the client deducts 10 from the Robustness score.
- **Gate threshold:** ≥ 95 required to pass. 95+ requires **zero** identity leaks, **zero** raw-error leaks, and **all** critical-path tests green.
