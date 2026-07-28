import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import Avatar from '../atoms/Avatar';
import Badge from '../atoms/Badge';

// ── Nav icon helpers ──────────────────────────────────────────────────────

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const ExploreIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const CommunitiesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const ConnectionsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
);
const BellIcon = ({ count }) => (
  <span className="relative inline-flex items-center">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
    {count > 0 && (
      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-[9px] font-bold text-white leading-none">
        {count > 9 ? '9+' : count}
      </span>
    )}
  </span>
);
const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const QueueIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const SubmitIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);
const MineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);
const AnonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    <line x1="12" y1="14" x2="12" y2="14"/>
  </svg>
);

// ── NavItem ───────────────────────────────────────────────────────────────

function NavItem({ to, icon, label, active, onClick }) {
  const base =
    'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium ' +
    'transition-all duration-150 group';

  const activeStyle =
    'bg-[var(--color-primary-light)] text-[var(--color-primary)] shadow-[var(--shadow-xs)] ' +
    'border-l-2 border-[var(--color-primary)] pl-[calc(0.75rem-2px)]';

  const inactiveStyle =
    'text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-main)]';

  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} ${active ? activeStyle : inactiveStyle}`}>
        <span className={active ? 'text-[var(--color-primary)]' : 'text-[var(--text-subtle)] group-hover:text-[var(--text-muted)]'}>
          {icon}
        </span>
        {label}
      </button>
    );
  }

  return (
    <Link to={to} className={`${base} ${active ? activeStyle : inactiveStyle}`}>
      <span className={active ? 'text-[var(--color-primary)]' : 'text-[var(--text-subtle)] group-hover:text-[var(--text-muted)]'}>
        {icon}
      </span>
      {label}
    </Link>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────

export default function Sidebar() {
  const { user, mode, switchMode, logout } = useAuth();
  const { publicUnread, shadowUnread } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const activeUnread = mode === 'shadow' ? shadowUnread : publicUnread;
  const is = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleModeToggle = (targetMode) => {
    const res = switchMode(targetMode);
    if (res?.needsAnonSetup) {
      navigate('/anonymous/create');
    } else {
      navigate(targetMode === 'shadow' ? '/shadow/queue' : '/feed');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={`
        hidden lg:flex flex-col fixed left-0 top-0 h-screen w-60 z-50
        border-r border-[var(--border-main)] bg-[var(--bg-surface)]
        shadow-[var(--shadow-sm)]
      `}
    >
      {/* ─── Brand ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[var(--border-main)]">
        <Link
          to={mode === 'shadow' ? '/shadow/queue' : '/feed'}
          className="flex items-center gap-2.5 flex-1"
        >
          {/* Logo mark */}
          <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)] flex items-center justify-center shadow-[var(--shadow-sm)] shrink-0">
            <span className="text-white font-bold text-sm">CN</span>
          </div>
          <span className="text-base font-bold tracking-tight text-[var(--text-main)]">
            Code<span className="text-[var(--color-primary)]">Nest</span>
          </span>
        </Link>
      </div>

      {/* ─── Mode switcher ────────────────────────────────────────── */}
      {user && (
        <div className="px-3 py-3 border-b border-[var(--border-main)]">
          <div
            className="flex items-center rounded-xl border border-[var(--border-main)] bg-[var(--bg-base)] p-1 gap-1"
            role="group"
            aria-label="Switch between Feed and Shadow mode"
          >
            <button
              type="button"
              onClick={() => handleModeToggle('feed')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 ${
                mode === 'feed'
                  ? 'bg-[var(--bg-surface)] text-[var(--color-primary)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              🌐 Feed
            </button>
            <button
              type="button"
              onClick={() => handleModeToggle('shadow')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 ${
                mode === 'shadow'
                  ? 'bg-[var(--bg-surface)] text-[var(--color-primary)] shadow-[var(--shadow-xs)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              👤 Shadow
            </button>
          </div>
        </div>
      )}

      {/* ─── Navigation ────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {!user && (
          <>
            <NavItem to="/" icon={<HomeIcon />} label="Home" active={is('/')} />
          </>
        )}

        {user && mode === 'feed' && (
          <>
            <NavItem to="/feed" icon={<HomeIcon />} label="Home" active={is('/feed')} />
            <NavItem to="/explore" icon={<ExploreIcon />} label="Explore" active={is('/explore')} />
            <NavItem to="/communities" icon={<CommunitiesIcon />} label="Communities" active={is('/communities')} />
            <NavItem to="/connections" icon={<ConnectionsIcon />} label="Connections" active={is('/connections')} />
            <NavItem
              to="/notifications"
              icon={<BellIcon count={publicUnread} />}
              label="Notifications"
              active={is('/notifications')}
            />
          </>
        )}

        {user && mode === 'shadow' && (
          <>
            <NavItem to="/shadow/queue" icon={<QueueIcon />} label="Queue" active={is('/shadow/queue')} />
            <NavItem to="/shadow/submissions/new" icon={<SubmitIcon />} label="Submit Code" active={is('/shadow/submissions/new')} />
            <NavItem to="/shadow/mine" icon={<MineIcon />} label="My Submissions" active={is('/shadow/mine')} />
            <NavItem to="/shadow/community" icon={<AnonIcon />} label="Anon Community" active={is('/shadow/community')} />
            <NavItem
              to="/notifications?context=shadow"
              icon={<BellIcon count={shadowUnread} />}
              label="Notifications"
              active={is('/notifications')}
            />
          </>
        )}
      </nav>

      {/* ─── Bottom: User profile + settings ─────────────────────── */}
      <div className="border-t border-[var(--border-main)] p-3">
        {user ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 w-full rounded-xl px-2 py-2 hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              <Avatar
                src={mode === 'shadow' ? user.anonymous_avatar_url : user.avatar_url}
                name={mode === 'shadow' ? user.anonymous_username : user.name}
                size="sm"
              />
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-semibold text-[var(--text-main)] truncate">
                  {mode === 'shadow' ? (user.anonymous_username || 'Anonymous') : user.name}
                </p>
                {mode === 'feed' && (
                  <p className="text-[10px] text-[var(--text-subtle)] truncate">{user.email}</p>
                )}
              </div>
              <SettingsIcon />
            </button>

            {/* User dropdown */}
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] shadow-[var(--shadow-lg)] overflow-hidden z-50">
                <Link
                  to={mode === 'shadow' ? '/shadow/me' : `/users/${user.id}`}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)]"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  to="/settings/profile"
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)]"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-[var(--color-danger)] hover:bg-rose-50 text-left border-t border-[var(--border-main)]"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Link
              to="/login"
              className="block w-full py-2 text-center text-sm font-semibold rounded-xl border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="block w-full py-2 text-center text-sm font-semibold rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-sm)] transition-all hover:scale-[1.01]"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
