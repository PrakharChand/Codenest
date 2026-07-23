import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import { useAuth } from '../../context/AuthContext';
import OnboardingWalkthrough from '../organisms/OnboardingWalkthrough';

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
    <div className="min-h-screen bg-base text-main transition-colors duration-200">
      <Navbar />
      <main className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
        {children}
      </main>

      {/* Auto-trigger First Login Dual-Identity Walkthrough */}
      {showWalkthrough && (
        <OnboardingWalkthrough
          isOpen={showWalkthrough}
          onClose={() => setShowWalkthrough(false)}
        />
      )}
    </div>
  );
}
