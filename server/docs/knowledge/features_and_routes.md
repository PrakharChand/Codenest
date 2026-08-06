# CodeNest Features and Route Specifications

## Routing Matrix

### Public & Feed Surface Routes:
- `/` — Landing page with live metrics, feature highlights, and interactive preview.
- `/feed` — Public developer feed, AI Learning Roadmap, and Developer Recommendations.
- `/explore` — Search posts, tag filter, and popular technical topics.
- `/communities` — Join technology communities (React, Node.js, Python, AI/ML, System Design, DevOps).
- `/connections` — Manage connections, view pending connection requests, and discover developers.
- `/chat` — Real-time 1-to-1 live chat exclusively between mutual connections (edit/delete messages, delete chat thread, cyan seen checkmarks, sender toast notifications).
- `/users/:id` — Public user profile page with activity stats, bio, authored & tagged post history.
- `/ai-assistant` — CodeNest Guide AI Assistant for platform guidance and CS help.

### Shadow Surface Routes:
- `/shadow/queue` — Anonymous code review queue. Filter by language and review code anonymously.
- `/shadow/communities` — Nest Shadow Anonymous Communities (custom community creation & anonymous topic feeds).
- `/shadow/submissions/new` — Submit code anonymously for peer review with feedback questions.
- `/shadow/submissions/:id` — View code submission details, syntax-highlighted code block, and peer reviews.
- `/shadow/my-submissions` — Track your anonymous submissions and review status.
- `/shadow/my-reviews` — View code reviews you have provided to fellow developers.
- `/shadow/ai-mentor` — Shadow Mentor AI Assistant for code quality, DSA, system design, and review etiquette.

### User Account & Settings Routes:
- `/settings/ai` — Manage AI Assistant settings, model choice, temperature, max tokens, history resets, and chat exports.
- `/settings/profile` — Update real profile details, avatar, bio, and tech stack.
- `/notifications` — Real-time notification center for likes, comments, reviews, connection requests, and chat messages.

## Database Models & Security
- **Authentication**: JWT authentication with refresh token rotation stored in HttpOnly cookies.
- **AI Content Moderation & 5-Strike Ban System**: Automated scanning of posts, comments, and chat messages for bullying, harassment, sexual content, hate speech, or threats with instant deletion. Enforces a 5-strike progressive penalty schedule:
  - Strike 1 & 2: Instant content removal + flash warning modal on screen (`ViolationWarningModal.jsx`).
  - Strike 3: Warning modal + automated formal warning email sent to user's registered address (`emailService.js`).
  - Strike 4: Automatic 24-hour account suspension (`suspended_until`) blocking all user actions.
  - Strike 5+: Permanent account ban (`is_banned`) blacklisting email, GitHub account ID, and Google account ID in `banned_identifiers` table.
- **Privacy & Anonymity**: Real identities are strictly isolated from anonymous shadow handles (`anonymous_username`). The server never leaks real user IDs in Nest Shadow API responses.
- **System Theme Engine**: Automatic OS preference detection (`prefers-color-scheme: dark`) with pre-render flicker prevention.
- **Weekly Activity Time Spent Tracker**: Real-time study/coding time metric box formatting active learning in minutes (`45 mins`) or hours/minutes (`1h 45m`).
