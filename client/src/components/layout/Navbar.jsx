/**
 * Navbar.jsx — DEPRECATED
 *
 * Navigation is now split between:
 *   - Sidebar.jsx  → fixed left sidebar on desktop (≥ lg)
 *   - BottomNav.jsx → fixed bottom tab bar on mobile (< lg)
 *
 * Both are composed in AppShell.jsx.
 * This file is kept as a reference only and is no longer imported anywhere.
 */

import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import Avatar from '../atoms/Avatar';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Dropdown from '../molecules/Dropdown';
import HelpMenu from '../molecules/HelpMenu';

export default function Navbar() {
  const { user, mode, switchMode, logout } = useAuth();
  const { publicUnread, shadowUnread } = useNotifications();
  const navigate = useNavigate();

  const activeUnread = mode === 'shadow' ? shadowUnread : publicUnread;

  const handleModeToggle = (targetMode) => {
    const res = switchMode(targetMode);
    if (res?.needsAnonSetup) {
      navigate('/anonymous/create');
    } else {
      navigate(targetMode === 'shadow' ? '/shadow/queue' : '/feed');
    }
  };

  const userMenuItems = user
    ? [
        {
          label: mode === 'shadow' ? 'Shadow Profile' : 'Public Profile',
          onClick: () => navigate(mode === 'shadow' ? '/shadow/me' : `/users/${user.id}`),
        },
        {
          label: 'Settings',
          onClick: () => navigate('/settings/profile'),
        },
        {
          label: 'Logout',
          danger: true,
          onClick: () => {
            logout();
            navigate('/login');
          },
        },
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-main shadow-xs transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Mode Switcher */}
        <div className="flex items-center gap-6">
          <Link to={mode === 'shadow' ? '/shadow/queue' : '/feed'} className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-main">
              Code<span className="text-primary">Nest</span>
            </span>
            <Badge variant={mode === 'shadow' ? 'primary' : 'default'} size="sm">
              {mode === 'shadow' ? '👤 Shadow' : '🌐 Feed'}
            </Badge>
          </Link>

          {/* Mode Switch Tabs (Threshold Crossing Component) */}
          {user && (
            <div
              className="hidden sm:flex items-center rounded-lg border border-main bg-[var(--bg-base)] p-1"
              role="group"
              aria-label={`Currently in ${mode === 'feed' ? 'public feed' : 'anonymous shadow'} mode. Select to switch.`}
            >
              <button
                type="button"
                onClick={() => handleModeToggle('feed')}
                aria-label="Switch to Nest Feed (Public Mode)"
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                  mode === 'feed'
                    ? 'bg-surface text-primary shadow-xs font-bold'
                    : 'text-muted hover:text-main'
                }`}
              >
                🌐 Nest Feed
              </button>
              <button
                type="button"
                onClick={() => handleModeToggle('shadow')}
                aria-label="Switch to Nest Shadow (Anonymous Mode)"
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                  mode === 'shadow'
                    ? 'bg-surface text-primary shadow-xs font-bold'
                    : 'text-muted hover:text-main'
                }`}
              >
                👤 Nest Shadow
              </button>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-3">
          {mode === 'feed' ? (
            <>
              <Link to="/feed" className="text-sm font-medium text-muted hover:text-main">
                Feed
              </Link>
              <Link to="/communities" className="text-sm font-medium text-muted hover:text-main">
                Communities
              </Link>
            </>
          ) : (
            <>
              <Link to="/shadow/queue" className="text-sm font-medium text-muted hover:text-main font-mono">
                Queue
              </Link>
              <Link to="/shadow/submissions/new" className="text-sm font-medium text-muted hover:text-main font-mono">
                + Submit
              </Link>
              <Link to="/shadow/mine" className="text-sm font-medium text-muted hover:text-main font-mono">
                Mine
              </Link>
              <Link to="/shadow/community" className="text-sm font-medium text-muted hover:text-main font-mono">
                Anon Community
              </Link>
            </>
          )}

          {/* Persistent Navigation Help Menu */}
          {user && <HelpMenu />}

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to={mode === 'shadow' ? '/notifications?context=shadow' : '/notifications'}
                className="relative text-muted hover:text-main text-sm"
                title={`${mode === 'shadow' ? 'Shadow' : 'Public'} Notifications`}
              >
                🔔
                {activeUnread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white animate-pulse">
                    {activeUnread > 9 ? '9+' : activeUnread}
                  </span>
                )}
              </Link>

              <Dropdown
                trigger={
                  <button className="flex items-center gap-2 focus-visible:outline-none">
                    <Avatar
                      src={mode === 'shadow' ? user.anonymous_avatar_url : user.avatar_url}
                      name={mode === 'shadow' ? user.anonymous_username : user.name}
                      size="sm"
                    />
                    <span className="hidden md:inline text-xs font-medium text-main">
                      {mode === 'shadow' ? user.anonymous_username || 'Anonymous' : user.name}
                    </span>
                  </button>
                }
                items={userMenuItems}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                Get Started
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
