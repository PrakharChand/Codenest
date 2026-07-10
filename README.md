# CodeNest

A dual-identity developer platform. Every user has **one account, two identities**: a public identity on **Nest Feed** (social/learning) and a permanently anonymous identity on **Nest Shadow** (bias-free code review).

## Monorepo Layout

```
codenest/
├── client/          React + Vite frontend
├── server/          Express backend
│   ├── src/
│   │   ├── config/      db, env, cloudinary, passport
│   │   ├── routes/      URL definitions only
│   │   ├── controllers/ business logic
│   │   ├── middleware/  auth, error, validation, rateLimit
│   │   ├── db/          migrations, seed, query helpers
│   │   ├── utils/       serializers, helpers
│   │   └── app.js
│   └── server.js
├── .gitignore
├── CODENEST_REFERENCE.md
└── README.md
```

## Quick Start

1. Copy `server/.env.example` → `server/.env` and fill in real values.
2. `cd server && npm install && npm run dev`
3. `cd client && npm install && npm run dev`

See `CODENEST_REFERENCE.md` for the full architecture, conventions, and identity security rules.
