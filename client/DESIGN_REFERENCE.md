# CodeNest UI/UX Design Specification & Reference (`DESIGN_REFERENCE.md`)

> **Every frontend phase (Phases 7–12) reads this reference first before writing UI components or pages.**
> It defines the non-negotiable visual design rules, semantic token mapping, accessibility standards, atomic component contracts, and mode/theme behavior.

---

## 1. Aesthetic Mandate: "Not an AI Template"

CodeNest must **NEVER** look like a generic, off-the-shelf AI template:
- ❌ **NO** generic purple/violet-gradient-on-everything.
- ❌ **NO** heavy drop shadows or bloated 3D glassmorphic cards.
- ❌ **NO** emoji icons used as primary design elements or UI symbols.
- ❌ **NO** raw browser default forms or un-styled inputs.

### The Design Philosophy: Clean, Minimal, Calm, Human
- **Typography-First**: Confident typography hierarchy with generous whitespace and clear contrast.
- **Two Worlds, One Skeleton**:
  - **Nest Feed (Public)**: Warm, open, social. Clean light mode with warm neutral tones and rich accent colors.
  - **Nest Shadow (Anonymous)**: Cool, quiet, focused, private. Deep dark mode with cool slate/midnight surfaces and subtle code-focus accents.
  - Both share the exact same structural grid, padding system, component shapes, and atomic APIs.
- **Mode Switching**: A safety-critical boundary transition. The UI changes temperature and tone cleanly when switching between Feed and Shadow mode.

---

## 2. Directory Architecture

```
client/src/
├── api/          # Centralized Axios instance + resource API modules (authApi, postsApi, commentsApi, usersApi, communitiesApi, notificationsApi)
├── context/      # AuthContext, ThemeContext
├── components/   # Atomic design components
│   ├── atoms/    # Button, Input, TextArea, Avatar, Tag, Badge, Spinner, Skeleton
│   ├── molecules/# Card, Modal, Dropdown, EmptyState, Toast
│   └── layout/   # AppShell, Navbar, Sidebar
├── pages/        # Lazy-loaded route pages (Feed, Shadow, Auth, Onboarding)
├── hooks/        # Custom React hooks (useAuth, useTheme, useDebounce, etc.)
├── routes/       # Router config, PublicRoute, ProtectedRoute, ShadowRoute
├── lib/          # Utilities (formatters, date helpers, error parsing)
└── styles/       # index.css (single global CSS stylesheet with Tailwind + CSS variables)
```

---

## 3. Semantic Color Token System

Theme switching is driven by root classes (`.theme-feed` and `.theme-shadow`) on `<html>`.
Components **MUST NEVER** branch on mode to select hardcoded colors (`mode === 'shadow' ? '#000' : '#fff'` is strictly forbidden). Every component uses semantic Tailwind utilities (e.g. `bg-surface text-main border-main`).

### Token Definitions

| Token CSS Variable | Nest Feed (`.theme-feed`) | Nest Shadow (`.theme-shadow`) | Tailwind Class Usage |
|---|---|---|---|
| `--bg-base` | `#F9FAFB` (Warm Off-White) | `#0B0F17` (Deep Midnight Slate) | `bg-base` |
| `--bg-surface` | `#FFFFFF` (Pure White) | `#131924` (Rich Slate Surface) | `bg-surface` |
| `--bg-surface-hover` | `#F3F4F6` (Light Gray Hover) | `#1E2638` (Elevated Slate Hover) | `bg-surface-hover` |
| `--bg-surface-subtle` | `#F8FAFC` (Subtle Card Fill) | `#0F172A` (Inset Panel Dark) | `bg-surface-subtle` |
| `--border-main` | `#E2E8F0` (Soft Border) | `#212C3D` (Subtle Dark Border) | `border-main` |
| `--border-focus` | `#6366F1` (Indigo Focus) | `#38BDF8` (Sky Blue Focus) | `border-focus` |
| `--text-main` | `#0F172A` (Deep Charcoal) | `#F8FAFC` (Bright Slate) | `text-main` |
| `--text-muted` | `#475569` (Muted Slate) | `#94A3B8` (Muted Cool Gray) | `text-muted` |
| `--text-subtle` | `#94A3B8` (Subtle Gray) | `#64748B` (Dark Muted Gray) | `text-subtle` |
| `--color-primary` | `#4F46E5` (Warm Indigo) | `#0EA5E9` (Electric Cyan) | `bg-primary`, `text-primary` |
| `--color-primary-hover` | `#4338CA` (Darker Indigo) | `#0284C7` (Darker Cyan) | `bg-primary-hover` |
| `--color-primary-light` | `#EEF2FF` (Indigo Tint) | `#075985` (Cyan Inset Tint) | `bg-primary-light` |
| `--color-success` | `#10B981` (Emerald) | `#10B981` (Emerald Glow) | `text-success`, `bg-success` |
| `--color-danger` | `#EF4444` (Rose Red) | `#F87171` (Cool Crimson) | `text-danger`, `bg-danger` |
| `--color-warning` | `#F59E0B` (Amber) | `#FBBF24` (Amber Gold) | `text-warning`, `bg-warning` |

---

## 4. Typography Scale & Spacing

### Font Stack
- **Sans-Serif**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Monospace (Code)**: "JetBrains Mono", Fira Code, Consolas, monospace

### Spacing Base (8-Point Grid)
- `4px` (0.5), `8px` (1), `12px` (1.5), `16px` (2), `24px` (3), `32px` (4), `48px` (6), `64px` (8)

---

## 5. Accessibility & Motion Baseline (WCAG AA)

1. **Visible Focus Indicators**: All interactive elements have focus rings (`focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none`).
2. **Contrast Standard**: All text meets WCAG AA minimum 4.5:1 ratio against surface background.
3. **Motion**: All transitions use `@media (prefers-reduced-motion: reduce)` fallbacks.
4. **Form Labels**: Every input element has an associated label (`htmlFor`) or `aria-label`.

---

## 6. Frontend Security & Auth Boundary Rules

1. **In-Memory Access Tokens**: Access tokens live strictly in React state / memory (`AuthContext`). **NEVER stored in `localStorage` or `sessionStorage`**.
2. **HttpOnly Refresh Cookies**: Refresh tokens are handled automatically by browser cookies (set by backend).
3. **Centralized HTTP via Axios**: All HTTP requests use `client/src/api/axios.js`. Raw `fetch()` calls are strictly forbidden in UI components.
4. **Shadow API Isolation Rule**: Shadow pages (`/shadow/*`) MUST ONLY import `shadowApi.js` and NEVER import `postsApi`, `usersApi`, or `communitiesApi`. This physically segregates the public and anonymous data paths on the frontend.
5. **Route Guards**:
   - `PublicRoute`: Allows unauthenticated access.
   - `ProtectedRoute`: Requires valid auth (`accessToken` or successful `/api/auth/me`). Redirects to login preserving `from` location.
   - `ShadowRoute`: Requires auth **and** `has_anonymous_identity = true`. Redirects to anonymous creation flow if missing.

---

## 7. Mode-Switch Transition Specification

- **Safety-Critical Boundary**: The mode-switch transition between Nest Feed and Nest Shadow must be unmissable to prevent identity confusion.
- **Visual Mechanics**:
  - Toggles `.theme-feed` vs `.theme-shadow` + `.dark` on `<html>`.
  - Color & background transition: 300ms ease-in-out (`transition-colors duration-300`).
  - Navbar identity swap: Real name & avatar $\leftrightarrow$ Permanent anonymous username & default avatar.
  - Reduced Motion: Instant swap when `@media (prefers-reduced-motion: reduce)` is active.
- **Accessibility**: Toggle button includes dynamic ARIA labels (e.g. `aria-label="Currently in public mode. Switch to anonymous shadow mode."`).
- **Anon Identity Guard**: Clicking the switch when `has_anonymous_identity = false` automatically redirects the user to `/anonymous/create`.

---

## 8. Verification Standards
- Zero hardcoded hex colors in components.
- Clean production build (`npm run build`).
- Single-flight refresh token queue in `axios.js`.
- Strict API module separation between Feed and Shadow pages.

