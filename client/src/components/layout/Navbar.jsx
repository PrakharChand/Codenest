import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../atoms/Avatar';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Dropdown from '../molecules/Dropdown';
import HelpMenu from '../molecules/HelpMenu';

export default function Navbar() {
  const { user, mode, switchMode, logout } = useAuth();
  const navigate = useNavigate();

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
    <header className="sticky top-0 z-40 w-full border-b border-main bg-surface/90 backdrop-blur-md transition-colors duration-300">
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
              className="hidden sm:flex items-center rounded-lg border border-main bg-base p-1"
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
                className="text-muted hover:text-main text-sm"
                title="Notifications"
              >
                🔔
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
