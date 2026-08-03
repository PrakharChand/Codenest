/**
 * client/src/components/atoms/ThemeToggle.jsx
 *
 * Sun / Moon toggle button for Feed light/dark mode.
 * Invisible in Shadow mode — Shadow is always dark.
 *
 * Props:
 *   showLabel — shows "Light Mode" / "Dark Mode" text next to the icon
 *   className — additional classes
 */

import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ showLabel = false, className = '' }) {
  const { isShadow, feedTheme, toggleFeedTheme } = useTheme();

  // Don't render in Shadow mode — it's always dark
  if (isShadow) return null;

  const isDark = feedTheme === 'dark';

  return (
    <button
      onClick={toggleFeedTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`
        inline-flex items-center gap-2
        ${showLabel ? 'px-3 py-2 rounded-xl' : 'w-9 h-9 rounded-full justify-center'}
        border border-[var(--border-main)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)]
        transition-all duration-200 text-muted hover:text-main text-sm font-medium
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]
        ${className}
      `}
    >
      {isDark ? (
        /* Sun icon — shown in dark mode to switch to light */
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        /* Moon icon — shown in light mode to switch to dark */
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
      {showLabel && (
        <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
      )}
    </button>
  );
}
