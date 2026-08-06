import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { setAccessToken, getAccessToken, setOnAuthFailure, setOnModerationViolation } from '../api/axios';
import { ThemeProvider } from './ThemeContext';
import ViolationWarningModal from '../components/molecules/ViolationWarningModal';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('feed'); // 'feed' | 'shadow'
  const [accessTokenState, setAccessTokenState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [anonNotice, setAnonNotice] = useState(false);
  const [modViolationData, setModViolationData] = useState(null);

  // Set up axial failure & moderation violation handlers
  useEffect(() => {
    setOnAuthFailure(() => {
      setUser(null);
      setAccessTokenState(null);
      setAccessToken(null);
      setMode('feed');
    });

    setOnModerationViolation((data) => {
      setModViolationData(data);
    });
  }, []);

  // Rehydrate auth state on mount.
  useEffect(() => {
    async function rehydrate() {
      try {
        const existing = getAccessToken();
        if (!existing) {
          const refreshRes = await api.post('/api/auth/refresh');
          setAccessToken(refreshRes.data.accessToken);
        }
        const { data } = await api.get('/api/auth/me');
        setUser(data.user);
      } catch (err) {
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    rehydrate();
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    setAccessToken(token);
    setAccessTokenState(token);
    setMode('feed');
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      // Ignore errors on logout
    } finally {
      setUser(null);
      setAccessToken(null);
      setAccessTokenState(null);
      setMode('feed');
    }
  };

  const switchMode = (targetMode) => {
    if (targetMode === 'shadow') {
      if (!user?.has_anonymous_identity) {
        setAnonNotice(true);
        return { needsAnonSetup: true };
      }
    }
    setAnonNotice(false);
    setMode(targetMode);
    return { success: true };
  };

  const value = {
    user,
    setUser,
    mode,
    accessToken: accessTokenState,
    isLoading,
    login,
    logout,
    switchMode,
    anonNotice,
    setAnonNotice,
  };

  return (
    <AuthContext.Provider value={value}>
      <ThemeProvider mode={mode}>
        {children}
        <ViolationWarningModal
          isOpen={!!modViolationData}
          onClose={() => setModViolationData(null)}
          violationData={modViolationData}
        />
      </ThemeProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
