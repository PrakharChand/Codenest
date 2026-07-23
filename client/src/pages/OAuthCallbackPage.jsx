import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { setAccessToken } from '../api/axios';
import Spinner from '../components/atoms/Spinner';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    async function handleOAuth() {
      const token = searchParams.get('token');
      if (!token) {
        navigate('/login?error=oauth_failed', { replace: true });
        return;
      }

      // 1. Immediately store token in memory
      setAccessToken(token);

      // 2. Clear token from URL query params for security
      window.history.replaceState({}, document.title, window.location.pathname);

      try {
        // 3. Rehydrate user profile
        const { data } = await api.get('/api/auth/me');
        login(data.user, token);
        navigate('/feed', { replace: true });
      } catch (err) {
        navigate('/login?error=oauth_failed', { replace: true });
      }
    }

    handleOAuth();
  }, [searchParams, navigate, login]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-base text-main">
      <div className="text-center space-y-4">
        <Spinner size="lg" />
        <p className="text-muted">Authenticating with OAuth...</p>
      </div>
    </div>
  );
}
