# CodeNest 🚀

A dual-identity developer platform designed for un-biased code review and public developer networking. Every developer on CodeNest has **one account with two distinct identities**:

1. **Nest Feed (Public Identity)**: Share your real identity, publish blogs, showcase projects, join public communities, chat live with mutual connections, and network with developers.
2. **Nest Shadow (Anonymous Identity)**: A zero-bias code review sanctuary. Get a permanent anonymous handle (e.g. `silent_fox42`) to submit code, receive honest, constructive reviews, and join custom anonymous tech communities free from clout or popularity bias.

---

## 🌟 Key Features

- **Dual-Identity Architecture**: Seamlessly switch between public and anonymous worlds with an unmissable sub-400ms theme transition.
- **Identity Leak-Proof Security**: Strict server-side serializers (`shadowSerializer.js`) and database constraints guarantee that public identity data (real name, email, avatar) **never** leaks into Nest Shadow endpoints or socket streams.
- **Real-Time Live Chat (Nest Feed)**:
  - Exclusive 1-to-1 live messaging between **mutual connections** (developers who follow each other).
  - Message edit (`✏️`) and delete (`🗑️`) controls with `(edited)` indicators.
  - Full conversation thread deletion for clean chat history.
  - Crystal clear read receipts (`✓` delivered vs. `✓✓` cyan seen indicator).
  - Real-time toast notifications tagged with sender names (`💬 Message from [Name]`).
- **Nest Shadow Anonymous Communities**:
  - Custom anonymous community creation (`+ Create Anon Community`) with dedicated discussion hubs.
  - Anonymous post feeds with author identity isolation.
- **Automatic System Theme Engine**:
  - Auto-detects system/browser color scheme (`prefers-color-scheme: dark`) on initial boot.
  - Instant zero-flicker pre-render theme application script in `<head>`.
  - Remembers user's manual Sun/Moon toggle preferences via `localStorage`.
- **Structured Code Reviews**: Reviews broken into three feedback sections (*What went well*, *Areas for improvement*, *Recommended resources*) with 1–5 star helpfulness ratings and 3-way reputation scoring.
- **AI-Powered Features (Anthropic Claude 3.5 Sonnet Integration)**:
  - **Pre-Submit Anonymity Guard**: Client-side scan flagging accidental PII leaks (names, emails, credentials).
  - **Smart Tag Suggestion**: Contextual tag generation for posts and code requests.
  - **Personalized Learning Roadmaps**: Interactive week-by-week study plans generated from your goals.
  - **Smart Connection Suggestions**: Discover relevant developers based on shared technology interests.
  - **Hourly AI Auto-Review**: Cron job providing high-quality automated reviews for 24h+ zero-review submissions.
- **Real-Time Notifications (Socket.io)**: Live 1-to-1 unread notification delivery with toast popups and mode-aware unread badges.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite 6, TailwindCSS, Recharts, React Hot Toast, UIW Markdown Editor, Socket.io-client.
- **Backend**: Node.js 18+, Express 4, PostgreSQL (`pg`), Socket.io 4, Passport.js (GitHub & Google OAuth 2.0), Cloudinary, Anthropic API SDK.
- **Database Migrations**: 38 SQL migrations (`001_users.sql` to `038_notifications_type_check.sql`).

---

## 📁 Repository Structure

```
codenest/
├── client/                     React 18 + Vite frontend
│   ├── src/
│   │   ├── api/                Centralized Axios + resource API modules (chatApi, postsApi, usersApi, shadowApi)
│   │   ├── components/         Atomic design system (atoms, molecules, organisms, layout)
│   │   ├── context/            AuthContext, ThemeContext, ConnectionContext, NotificationContext
│   │   ├── pages/              Lazy-loaded routes (Feed, Shadow, Chat, Explore, Communities, Auth)
│   │   ├── realtime/           Managed Socket.io connection & event subscribers
│   │   ├── routes/             Route guards (PublicRoute, ProtectedRoute, ShadowRoute)
│   │   └── styles/             Semantic CSS token definitions & dark mode variables
│   ├── DESIGN_REFERENCE.md     UI/UX design specification
│   └── package.json
├── server/                     Express 4 backend
│   ├── src/
│   │   ├── config/             Database connection pool, env validation, Cloudinary, Passport
│   │   ├── controllers/        Business logic handlers (chatController, postController, shadowCommunityController, etc.)
│   │   ├── db/                 Migrations (001-038), seeders, query helpers
│   │   ├── jobs/               Cron jobs (AI auto-review)
│   │   ├── middleware/         Auth, validation, error handling, rate limiting
│   │   ├── realtime/           Socket.io server, handshake auth, 1-to-1 notify & chat rooms
│   │   ├── routes/             Express router definitions (chatRoutes, shadowCommunityRoutes, etc.)
│   │   └── utils/              Shadow serializers, tokens, pagination, transactions
│   ├── server.js               HTTP + Socket.io entry point
│   └── package.json
├── CODENEST_REFERENCE.md       System specifications, database schema & identity rules
└── README.md
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL database

### 1. Backend Setup
```bash
cd server

# Copy environment template
cp .env.example .env

# Configure PostgreSQL connection & API keys in .env
# Run migrations (001 to 038) and seed lookup data
npm run migrate
npm run seed

# Start server in watch mode
npm run dev
```

### 2. Frontend Setup
```bash
cd client

# Install dependencies and start Vite dev server
npm install
npm run dev
```

### 3. Run Automated Tests
```bash
cd server
npm test
```

---

## 🌐 Production Deployment Guide

| Service | Platform | Environment Variables / Build Config |
|---|---|---|
| **Database** | Supabase / Render Postgres | Connection string with `ssl: { rejectUnauthorized: false }` |
| **Backend** | Render / Railway | `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY_*`, `GITHUB_*`, `GOOGLE_*`, `ANTHROPIC_API_KEY`, `CLIENT_URL` |
| **Frontend** | Vercel / Netlify | `VITE_API_URL` pointing to backend production domain |

---

## 📄 License
MIT License. Created for the CodeNest project.
