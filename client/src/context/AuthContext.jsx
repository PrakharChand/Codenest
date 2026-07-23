import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { setAccessToken, getAccessToken, setOnAuthFailure } from '../api/axios';
import { ThemeProvider } from './ThemeContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('feed'); // 'feed' | 'shadow'
  const [accessTokenState, setAccessTokenState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [anonNotice, setAnonNotice] = useState(false);

  // Set up axial failure handler
  useEffect(() => {
    setOnAuthFailure(() => {
      setUser(null);
      setAccessTokenState(null);
      setAccessToken(null);
      setMode('feed');
    });
  }, []);

  // Rehydrate auth state on mount via GET /api/auth/me
  useEffect(() => {
    async function rehydrate() {
      try {
        // Attempt silent refresh first if no access token exists
        let token = getAccessToken();
        if (!token) {
          const refreshRes = await api.post('/api/auth/refresh');
          token = refreshRes.data.accessToken;
          setAccessToken(token);
          setAccessTokenState(token);
        }

        const { data } = await api.get('/api/auth/me');
        setUser(data.user);
      } catch (err) {
        // Unauthenticated or refresh failed — clean state
        setUser(null);
        setAccessToken(null);
        setAccessTokenState(null);
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
      <ThemeProvider mode={mode}>{children}</ThemeProvider>
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
