import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import OnboardingWalkthrough from '../organisms/OnboardingWalkthrough';

/**
 * AppShell — the master layout wrapper.
 *
 * Desktop (≥ lg): fixed Sidebar (240px) on left, content pushed right.
 * Mobile (< lg):  no sidebar, BottomNav fixed at bottom, content has pb-28 clearance.
 */
export default function AppShell({ children, className = '' }) {
  const { user } = useAuth();
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  useEffect(() => {
    if (user && user.onboarding_completed_at === null) {
      setShowWalkthrough(true);
    } else {
      setShowWalkthrough(false);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-main)]">
      {/* Fixed left sidebar — desktop only */}
      <Sidebar />

      {/* Main content area — offset on desktop, full-width on mobile */}
      <div className="lg:pl-60">
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

      {/* Auto-triggered onboarding walkthrough */}
      {showWalkthrough && (
        <OnboardingWalkthrough
          isOpen={showWalkthrough}
          onClose={() => setShowWalkthrough(false)}
        />
      )}
    </div>
  );
}
