import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../atoms/Button';

/**
 * ShadowDiscoveryBanner — Prominent dismissable banner introducing Nest Shadow Mode.
 * Appears on FeedPage for users without an anonymous identity.
 * Persists dismissal in localStorage ('cn_shadow_banner_dismissed').
 */
export default function ShadowDiscoveryBanner() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (user?.has_anonymous_identity) {
      setIsVisible(false);
      return;
    }

    const isDismissed = localStorage.getItem('cn_shadow_banner_dismissed') === 'true';
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, [user]);

  const handleDismiss = () => {
    localStorage.setItem('cn_shadow_banner_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible || !user) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-[var(--bg-surface)] to-purple-950/30 p-5 shadow-lg mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl shrink-0 p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">🕵️</span>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-main flex items-center gap-2">
              Discover Nest Shadow Mode
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                100% Anonymous
              </span>
            </h3>
            <p className="text-xs text-muted leading-relaxed max-w-xl">
              Get unbiased, peer-reviewed code feedback from fellow engineers with zero identity leakage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Link to="/shadow/create">
            <Button size="sm" variant="primary" className="bg-cyan-600 hover:bg-cyan-500 text-white border-none shadow-md">
              Set Up Anonymous Identity
            </Button>
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-muted hover:text-main hover:bg-[var(--bg-surface-hover)] transition-colors text-xs"
            title="Dismiss banner"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
