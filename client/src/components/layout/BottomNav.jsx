import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

// ── Icons ─────────────────────────────────────────────────────────────────

const HomeIcon = ({ filled }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const ExploreIcon = ({ filled }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.15 : 0}/>
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const QueueIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const BellIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);
const ProfileIcon = ({ filled }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const AddIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);

// ── BottomNavItem ─────────────────────────────────────────────────────────

function BottomNavItem({ to, icon, label, active, badge }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-colors ${
        active
          ? 'text-[var(--color-primary)]'
          : 'text-[var(--text-subtle)] hover:text-[var(--text-muted)]'
      }`}
    >
      <span className="relative">
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-[9px] font-bold text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      {label}
    </Link>
  );
}

// ── Main BottomNav ────────────────────────────────────────────────────────

export default function BottomNav() {
  const { user, mode, switchMode } = useAuth();
  const { publicUnread, shadowUnread } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const is = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const activeUnread = mode === 'shadow' ? shadowUnread : publicUnread;

  const handleModeToggle = () => {
    const targetMode = mode === 'feed' ? 'shadow' : 'feed';
    const res = switchMode(targetMode);
    if (res?.needsAnonSetup) {
      navigate('/anonymous/create');
    } else {
      navigate(targetMode === 'shadow' ? '/shadow/queue' : '/feed');
    }
  };

  if (!user) {
    // Public bottom nav for logged-out state
    return (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border-main)] bg-[var(--bg-surface)] flex items-center justify-around shadow-[var(--shadow-lg)]">
        <BottomNavItem to="/" icon={<HomeIcon filled={is('/')} />} label="Home" active={is('/')} />
        <BottomNavItem to="/login" icon={<ProfileIcon filled={false} />} label="Sign In" active={is('/login')} />
        <BottomNavItem to="/register" icon={<AddIcon />} label="Join" active={is('/register')} />
      </nav>
    );
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border-main)] bg-[var(--bg-surface)] shadow-[var(--shadow-lg)]">
      {/* Mode toggle pill above tabs */}
      <div className="flex justify-center pt-1.5 pb-0">
        <button
          onClick={handleModeToggle}
          className={`
            inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-[10px] font-bold
            border transition-all
            ${mode === 'shadow'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-light)]'
              : 'border-[var(--border-main)] text-[var(--text-muted)] bg-[var(--bg-base)]'
            }
          `}
        >
          {mode === 'shadow' ? '👤 Shadow mode' : '🌐 Feed mode'} — tap to switch
        </button>
      </div>

      <div className="flex items-center justify-around">
        {mode === 'feed' ? (
          <>
            <BottomNavItem to="/feed" icon={<HomeIcon filled={is('/feed')} />} label="Home" active={is('/feed')} />
            <BottomNavItem to="/explore" icon={<ExploreIcon filled={is('/explore')} />} label="Explore" active={is('/explore')} />
            <BottomNavItem to="/communities" icon={<QueueIcon />} label="Communities" active={is('/communities')} />
            <BottomNavItem to="/notifications" icon={<BellIcon />} label="Inbox" active={is('/notifications')} badge={publicUnread} />
            <BottomNavItem to={`/users/${user.id}`} icon={<ProfileIcon filled={is(`/users/${user.id}`)} />} label="Me" active={is(`/users/${user.id}`)} />
          </>
        ) : (
          <>
            <BottomNavItem to="/shadow/queue" icon={<HomeIcon filled={is('/shadow/queue')} />} label="Queue" active={is('/shadow/queue')} />
            <BottomNavItem to="/shadow/submissions/new" icon={<AddIcon />} label="Submit" active={is('/shadow/submissions/new')} />
            <BottomNavItem to="/shadow/mine" icon={<QueueIcon />} label="Mine" active={is('/shadow/mine')} />
            <BottomNavItem to="/notifications?context=shadow" icon={<BellIcon />} label="Inbox" active={is('/notifications')} badge={shadowUnread} />
            <BottomNavItem to="/shadow/me" icon={<ProfileIcon filled={is('/shadow/me')} />} label="Me" active={is('/shadow/me')} />
          </>
        )}
      </div>
    </nav>
  );
}
