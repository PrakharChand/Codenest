import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children, mode = 'feed' }) {
  const [activeMode, setActiveMode] = useState(mode);

  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    if (activeMode === 'shadow') {
      root.classList.remove('theme-feed');
      root.classList.add('theme-shadow', 'dark');
    } else {
      root.classList.remove('theme-shadow', 'dark');
      root.classList.add('theme-feed');
    }
  }, [activeMode]);

  return (
    <ThemeContext.Provider value={{ mode: activeMode, isShadow: activeMode === 'shadow' }}>
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
