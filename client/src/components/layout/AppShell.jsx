import React, { useState } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import OnboardingModal from '../organisms/OnboardingModal';
import api from '../../api/axios';
import toast from 'react-hot-toast';

/**
 * AppShell — the master layout wrapper.
 *
 * Desktop (≥ lg): fixed Sidebar (240px) on left, content pushed right.
 * Mobile (< lg):  no sidebar, BottomNav fixed at bottom, content has pb-32 clearance.
 */
export default function AppShell({ children, className = '', hideSidebar = false, fullWidth = false }) {
  const { user, setUser } = useAuth();
  const [verifying, setVerifying] = useState(false);
  const isUnverified = user && user.verified === false;

  const handleVerifyMe = async () => {
    setVerifying(true);
    try {
      const { data } = await api.post('/api/auth/verify-me');
      if (data.user && setUser) {
        setUser((prev) => ({ ...prev, verified: true }));
        toast.success('Email verified successfully! Full features unlocked.');
      }
    } catch (err) {
      toast.error('Could not verify account automatically.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-main)]">
      {/* Fixed left sidebar — desktop only (hidden when hideSidebar is true) */}
      {!hideSidebar && <Sidebar />}

      {/* Main content area — offset on desktop when sidebar active, full-width when hideSidebar */}
      <div className={hideSidebar ? 'w-full' : 'lg:pl-60'}>
        {/* Persistent Email Verification Banner for unverified users */}
        {isUnverified && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs font-semibold text-amber-500 flex items-center justify-center gap-3 flex-wrap">
            <span>✉️ Please check your inbox and verify your email address to unlock full features.</span>
            <button
              type="button"
              onClick={handleVerifyMe}
              disabled={verifying}
              className="px-2.5 py-0.5 rounded bg-amber-500 text-black font-bold hover:bg-amber-400 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {verifying ? 'Verifying...' : 'Verify Now ⚡'}
            </button>
          </div>
        )}

        <main
          className={`
            ${fullWidth ? 'w-full' : hideSidebar ? 'mx-auto max-w-7xl px-4 sm:px-8 py-8' : 'mx-auto max-w-7xl px-4 sm:px-8 py-8'}
            pb-32 lg:pb-10
            page-enter
            ${className}
          `}
        >
          {children}
        </main>
      </div>

      {/* Fixed bottom nav — mobile only */}
      {!hideSidebar && <BottomNav />}

      {/* Auto-triggered 3-step Onboarding Modal for new users */}
      <OnboardingModal />
    </div>
  );
}
