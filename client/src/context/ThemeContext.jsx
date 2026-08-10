import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext(null);

const FEED_THEME_KEY = 'cn_feed_theme'; // 'light' | 'dark'

/**
 * Detect user's OS / browser color scheme preference.
 * Priority: System dark mode -> System light mode -> Fallback 'dark'
 */
function getSystemTheme() {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark'; // Fallback if system detection fails
  } catch {
    return 'dark';
  }
}

/**
 * Get initial theme adhering to strict priority:
 * 1. User Saved Preference (localStorage)
 * 2. System / Browser Preferred Theme
 * 3. Fallback 'dark'
 */
function getInitialTheme() {
  try {
    const saved = localStorage.getItem(FEED_THEME_KEY);
    if (saved === 'light' || saved === 'dark') {
      return { theme: saved, isManual: true };
    }
  } catch {
    // Ignore localStorage errors (e.g. private browsing)
  }
  return { theme: getSystemTheme(), isManual: false };
}

export function ThemeProvider({ children, mode = 'feed' }) {
  const [activeMode, setActiveMode] = useState(mode);
  const [{ theme: feedTheme, isManual }, setThemeState] = useState(getInitialTheme);

  // Keep activeMode synchronized with AuthContext prop
  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  // ── Dynamic System Theme Listener ──────────────────────────────────────
  // If user has NOT manually set a theme, automatically follow system theme changes
  useEffect(() => {
    if (isManual) return; // Ignore system changes if user manually set preference

    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e) => {
      // Re-verify localStorage to ensure user didn't manually toggle in another tab
      let hasSaved = false;
      try {
        hasSaved = !!localStorage.getItem(FEED_THEME_KEY);
      } catch {
        hasSaved = false;
      }

      if (!hasSaved) {
        setThemeState({
          theme: e.matches ? 'dark' : 'light',
          isManual: false,
        });
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemThemeChange);
      return () => mediaQuery.removeListener(handleSystemThemeChange);
    }
  }, [isManual]);

  // ── Apply CSS Theme Classes to <html> Element ────────────────────────────
  useEffect(() => {
    const root = document.documentElement;

    if (activeMode === 'shadow') {
      root.classList.remove('theme-feed', 'dark-mode');
      root.classList.add('theme-shadow', 'dark');
    } else {
      root.classList.remove('theme-shadow', 'dark');
      root.classList.add('theme-feed');
      if (feedTheme === 'dark') {
        root.classList.add('dark-mode');
      } else {
        root.classList.remove('dark-mode');
      }
    }
  }, [activeMode, feedTheme]);

  // ── Toggle Theme Manually ───────────────────────────────────────────────
  const toggleFeedTheme = useCallback(() => {
    setThemeState((prev) => {
      const nextTheme = prev.theme === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(FEED_THEME_KEY, nextTheme);
      } catch {
        // Ignore storage failure
      }
      return { theme: nextTheme, isManual: true };
    });
  }, []);

  // ── Clear Manual Preference (Revert to System Theme) ───────────────────
  const clearThemePreference = useCallback(() => {
    try {
      localStorage.removeItem(FEED_THEME_KEY);
    } catch {
      // Ignore
    }
    setThemeState({
      theme: getSystemTheme(),
      isManual: false,
    });
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        mode: activeMode,
        isShadow: activeMode === 'shadow',
        feedTheme,
        isDark: activeMode === 'shadow' || feedTheme === 'dark',
        isManual,
        toggleFeedTheme,
        clearThemePreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      isShadow: false,
      feedTheme: 'dark',
      toggleFeedTheme: () => {},
      setFeedTheme: () => {},
      clearThemePreference: () => {},
    };
  }
  return context;
}
