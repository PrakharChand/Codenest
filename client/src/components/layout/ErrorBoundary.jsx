import React from 'react';

/* ─────────────────────────────────────────────────────────────────────────
   ErrorBoundary — catches runtime rendering errors across the entire tree.

   React requires error boundaries to be *class* components.
   The fallback UI reuses the project's CSS custom-property design system
   so it stays consistent regardless of theme / dark-mode.
   ───────────────────────────────────────────────────────────────────────── */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.handleRetry   = this.handleRetry.bind(this);
    this.handleGoHome  = this.handleGoHome.bind(this);
  }

  /* ── Lifecycle ────────────────────────────────────────────────────────── */

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log to console in development; swap for a real service (Sentry, etc.)
    // in production without changing this component.
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary] Caught rendering error:', error, errorInfo);
    }
  }

  /* ── Actions ──────────────────────────────────────────────────────────── */

  handleRetry() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  handleGoHome() {
    // Hard-navigate so the entire React tree re-mounts cleanly.
    window.location.href = '/';
  }

  /* ── Render ───────────────────────────────────────────────────────────── */

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error } = this.state;
    const isDev = process.env.NODE_ENV !== 'production';

    return (
      <div
        role="alert"
        aria-live="assertive"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-base, #F8F7FF)',
          padding: '2rem',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            background: 'var(--bg-surface, #FFFFFF)',
            border: '1px solid var(--border-main, #DDD6FE)',
            borderRadius: 'var(--radius-xl, 20px)',
            boxShadow: 'var(--shadow-lg, 0 20px 48px -8px rgba(124,58,237,0.18))',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            animation: 'eb-fade-in 0.35s ease',
          }}
        >
          {/* Error icon */}
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          {/* Heading */}
          <h1
            style={{
              margin: '0 0 0.5rem',
              fontSize: '1.375rem',
              fontWeight: 700,
              color: 'var(--text-main, #1C1033)',
              lineHeight: 1.3,
            }}
          >
            Something went wrong
          </h1>

          {/* Sub-message */}
          <p
            style={{
              margin: '0 0 1.75rem',
              fontSize: '0.9375rem',
              color: 'var(--text-muted, #5B5475)',
              lineHeight: 1.6,
            }}
          >
            An unexpected error occurred while rendering this page. You can try
            again or return to the home screen.
          </p>

          {/* Dev error details — collapsed in production */}
          {isDev && error && (
            <details
              style={{
                marginBottom: '1.75rem',
                textAlign: 'left',
                background: 'var(--bg-base, #F8F7FF)',
                border: '1px solid var(--border-main, #DDD6FE)',
                borderRadius: 'var(--radius-sm, 8px)',
                padding: '0.75rem 1rem',
                fontSize: '0.8125rem',
                color: 'var(--text-muted, #5B5475)',
                cursor: 'pointer',
              }}
            >
              <summary style={{ fontWeight: 600, marginBottom: '0.5rem', listStyle: 'none' }}>
                ⚙ Error details (dev only)
              </summary>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                  fontSize: '0.75rem',
                  color: '#EF4444',
                }}
              >
                {error.toString()}
              </pre>
            </details>
          )}

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {/* Retry */}
            <button
              onClick={this.handleRetry}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                borderRadius: '0.75rem',
                border: '2px solid var(--color-primary, #7C3AED)',
                background: 'transparent',
                color: 'var(--color-primary, #7C3AED)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-primary-light, #EDE9FE)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
              aria-label="Try rendering the page again"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
              </svg>
              Try again
            </button>

            {/* Go Home */}
            <button
              onClick={this.handleGoHome}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                borderRadius: '0.75rem',
                border: 'none',
                background: 'var(--color-primary, #7C3AED)',
                color: '#FFFFFF',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm, 0 1px 4px 0 rgba(124,58,237,0.08))',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-primary-hover, #6D28D9)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--color-primary, #7C3AED)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              aria-label="Return to the home page"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Go Home
            </button>
          </div>
        </div>

        {/* Keyframe for the card entrance animation */}
        <style>{`
          @keyframes eb-fade-in {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }
}

export default ErrorBoundary;
