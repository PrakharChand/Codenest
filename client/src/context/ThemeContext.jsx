import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

const FEED_THEME_KEY = 'cn_feed_theme'; // 'light' | 'dark'

export function ThemeProvider({ children, mode = 'feed' }) {
  const [activeMode, setActiveMode] = useState(mode);

  // Independent feed light/dark preference — persisted to localStorage
  const [feedTheme, setFeedTheme] = useState(() => {
    try { return localStorage.getItem(FEED_THEME_KEY) || 'light'; } catch { return 'light'; }
  });

  // Sync activeMode when parent (AuthContext) changes the mode prop
  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  // Apply CSS classes to <html> element whenever mode or feedTheme changes
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

  const toggleFeedTheme = () => {
    setFeedTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(FEED_THEME_KEY, next); } catch { /* private browsing */ }
      return next;
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        mode: activeMode,
        isShadow: activeMode === 'shadow',
        feedTheme,
        isDark: activeMode === 'shadow' || feedTheme === 'dark',
        toggleFeedTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
