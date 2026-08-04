import React from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import OnboardingModal from '../organisms/OnboardingModal';

/**
 * AppShell — the master layout wrapper.
 *
 * Desktop (≥ lg): fixed Sidebar (240px) on left, content pushed right.
 * Mobile (< lg):  no sidebar, BottomNav fixed at bottom, content has pb-32 clearance.
 */
export default function AppShell({ children, className = '' }) {
  const { user } = useAuth();
  const isUnverified = user && user.verified === false;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-main)]">
      {/* Fixed left sidebar — desktop only */}
      <Sidebar />

      {/* Main content area — offset on desktop, full-width on mobile */}
      <div className="lg:pl-60">
        {/* Persistent Email Verification Banner for unverified users */}
        {isUnverified && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-center text-xs font-semibold text-amber-500 flex items-center justify-center gap-2">
            <span>✉️</span>
            <span>Please check your inbox and verify your email address to unlock full features.</span>
          </div>
        )}

        <main
          className={`
            mx-auto max-w-5xl px-4 sm:px-6 py-8
            pb-32 lg:pb-10
            page-enter
            ${className}
          `}
        >
          {children}
        </main>
      </div>

      {/* Fixed bottom nav — mobile only */}
      <BottomNav />

      {/* Auto-triggered 3-step Onboarding Modal for new users */}
      <OnboardingModal />
    </div>
  );
}
