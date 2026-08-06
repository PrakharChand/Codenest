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
- **Privacy & Anonymity**: Real identities are strictly isolated from anonymous shadow handles (`anonymous_username`). The server never leaks real user IDs in Nest Shadow API responses.
- **System Theme Engine**: Automatic OS preference detection (`prefers-color-scheme: dark`) with pre-render flicker prevention.
