# CodeNest 🚀

A dual-identity developer platform designed for un-biased code review and public developer networking. Every developer on CodeNest has **one account with two distinct identities**:

1. **Nest Feed (Public Identity)**: Share your real identity, publish blogs, showcase projects, join public communities, chat live with mutual connections, and network with developers.
2. **Nest Shadow (Anonymous Identity)**: A zero-bias code review sanctuary. Get a permanent anonymous handle (e.g. `silent_fox42`) to submit code, receive honest, constructive reviews, and join custom anonymous tech communities free from clout or popularity bias.

---

## 🌟 Key Features

- **Dual-Identity Architecture**: Seamlessly switch between public and anonymous worlds with an unmissable sub-400ms theme transition.
- **Identity Leak-Proof Security**: Strict server-side serializers (`shadowSerializer.js`) and database constraints guarantee that public identity data (real name, email, avatar) **never** leaks into Nest Shadow endpoints or socket streams.
- **AI Content Moderation & 5-Strike Ban System**:
  - Automated AI safety engine scanning posts, comments, and chat messages for inappropriate content (bullying, harassment, sexual abuse, hate speech, threats).
  - Instant content removal and progressive penalty schedule:
    - **Strike 1 & 2:** Instant removal + flash warning modal on screen.
    - **Strike 3:** Removal + warning modal + automated formal warning email sent to registered email address.
    - **Strike 4:** Removal + **24-hour account suspension** from all platform actions.
    - **Strike 5+:** Permanent ban blacklisting email, GitHub account ID, and Google account ID in `banned_identifiers`.
- **Real-Time Live Chat (Nest Feed)**:
  - Exclusive 1-to-1 live messaging between **mutual connections** (developers who follow each other).
  - Message edit (`✏️`) and delete (`🗑️`) controls with `(edited)` indicators.
  - Full conversation thread deletion for clean chat history.
  - Crystal clear read receipts (`✓` delivered vs. `✓✓` cyan seen indicator).
  - Real-time toast notifications tagged with sender names (`💬 Message from [Name]`).
- **Weekly Activity & Time Spent Tracker**:
  - Interactive Recharts activity trend visualization with streak tracking (`🔥 2d streak`).
  - Dynamic Time Spent metric box formatting study and coding time in minutes (`45 mins`) or hours/minutes (`1h 45m`).
- **Shadow Focus Mode Notifications**:
  - Context-isolated notifications filtering out public social updates to maintain a distraction-free code review space.
  - Direct routing to code submission reviews (`/shadow/submissions/:id`) with zero profile identity leakage.
- **Nest Shadow Anonymous Communities**:
  - Custom anonymous community creation (`+ Create Anon Community`) with dedicated discussion hubs.
  - Anonymous post feeds with author identity isolation.
- **Automatic System Theme Engine**:
  - Auto-detects system/browser color scheme (`prefers-color-scheme: dark`) on initial boot.
  - Instant zero-flicker pre-render theme application script in `<head>`.
  - Remembers user's manual Sun/Moon toggle preferences via `localStorage`.
- **Structured Code Reviews**: Reviews broken into three feedback sections (*What went well*, *Areas for improvement*, *Recommended resources*) with 1–5 star helpfulness ratings and 3-way reputation scoring.
- **AI-Powered Features (Google Gemini Integration)**:
  - **Pre-Submit Anonymity Guard**: Client-side scan flagging accidental PII leaks (names, emails, credentials).
  - **Smart Tag Suggestion**: Contextual tag generation for posts and code requests.
  - **Personalized Learning Roadmaps**: Interactive week-by-week study plans generated from your goals.
  - **Smart Connection Suggestions**: Discover relevant developers based on shared technology interests.
  - **Hourly AI Auto-Review**: Cron job providing high-quality automated reviews for 24h+ zero-review submissions.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite 6, TailwindCSS, Recharts, React Hot Toast, UIW Markdown Editor, Socket.io-client.
- **Backend**: Node.js 18+, Express 4, PostgreSQL (`pg`), Socket.io 4, Passport.js (GitHub & Google OAuth 2.0), Cloudinary, Google Gemini AI SDK.
- **Database Migrations**: 39 SQL migrations (`001_users.sql` to `039_content_moderation_and_bans.sql`).

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
│   │   ├── config/             Database connection pool, env validation, Cloudinary, Passport, Gemini
│   │   ├── controllers/        Business logic handlers (chatController, postController, shadowCommunityController, etc.)
│   │   ├── db/                 Migrations (001-039), seeders, query helpers
│   │   ├── jobs/               Cron jobs (AI auto-review)
│   │   ├── middleware/         Auth, validation, error handling, rate limiting
│   │   ├── realtime/           Socket.io server, handshake auth, 1-to-1 notify & chat rooms
│   │   ├── routes/             Express router definitions (chatRoutes, shadowCommunityRoutes, etc.)
│   │   └── services/           moderationService, emailService, aiService
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
# Run migrations (001 to 039) and seed lookup data
npm run migrate
npm run seed

# Start server in watch mode
npm run dev
```

### 2. Frontend Setup
```bash
cd client

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

---

## 🔒 Security & Privacy Commitments

1. **Zero Identity Leakage**: No API query or socket event in Nest Shadow returns user IDs, real names, or avatars.
2. **AI Content Moderation**: Strict 5-strike safety protocol enforcing instant post/comment deletion, 24-hour suspensions, and permanent multi-account blacklisting.
3. **No Self-Reviews**: Database unique constraints and application checks prevent users from reviewing their own code.
4. **Token Security**: Short-lived JWT Access Tokens stored in memory / `sessionStorage`, backed by HTTP-Only Refresh Cookies with SHA-256 hash validation in PostgreSQL.
