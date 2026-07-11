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
