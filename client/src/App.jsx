import React, { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ConnectionProvider } from './context/ConnectionContext';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes';
import ErrorBoundary from './components/layout/ErrorBoundary';
import api from './api/axios';

function App() {
  // ── Fix 1: Render Free Tier Keep-Alive Mechanism ──────────────────────────
  // Pings the backend /health endpoint every 10 minutes ONLY in production.
  // Prevents the Render free tier 15-minute inactivity spin down & 30s cold start.
  useEffect(() => {
    if (!import.meta.env.PROD) return;

    const TEN_MINUTES_MS = 10 * 60 * 1000;
    const pingHealth = () => {
      api.get('/health').catch(() => {
        // Silently swallow keep-alive ping errors in background
      });
    };

    pingHealth();
    const interval = setInterval(pingHealth, TEN_MINUTES_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ConnectionProvider>
          <NotificationProvider>
            <AppRoutes />
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          </NotificationProvider>
        </ConnectionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
