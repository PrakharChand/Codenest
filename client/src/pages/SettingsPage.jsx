/**
 * client/src/pages/SettingsPage.jsx
 *
 * Settings hub with tabs:
 *   - Profile (links to EditProfilePage)
 *   - Account info (email, joined date)
 *   - Theme preference (light/dark)
 *   - Danger zone (account deletion placeholder)
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/atoms/Card';
import Button from '../components/atoms/Button';
import Avatar from '../components/atoms/Avatar';
import ThemeToggle from '../components/atoms/ThemeToggle';

const TABS = [
  { id: 'account',    label: '👤 Account' },
  { id: 'appearance', label: '🎨 Appearance' },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-main">Settings</h1>
        <p className="text-sm text-muted mt-1">Manage your account and preferences.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--border-main)] pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted hover:text-main'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Account Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'account' && (
        <div className="space-y-5">
          {/* Profile card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Avatar src={user.avatar_url} name={user.name} size="lg" />
              <div className="min-w-0">
                <p className="text-base font-bold text-main truncate">{user.name}</p>
                <p className="text-sm text-muted truncate">{user.email}</p>
                <p className="text-xs text-subtle mt-0.5">
                  Member since{' '}
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
                    : '—'}
                </p>
              </div>
            </div>

            <Link to="/settings/profile">
              <Button variant="secondary" size="sm">✏️ Edit Public Profile</Button>
            </Link>
          </Card>

          {/* Shadow identity card */}
          {user.has_anonymous_identity ? (
            <Card className="p-6 space-y-2">
              <p className="text-sm font-semibold text-main">🕵️ Shadow Identity</p>
              <p className="text-sm text-muted">
                Your anonymous alias: <strong className="font-mono text-primary">{user.anonymous_username}</strong>
              </p>
              <p className="text-xs text-subtle">
                Your shadow identity is permanent and cannot be changed. It keeps your real
                identity separated from anonymous code reviews.
              </p>
            </Card>
          ) : (
            <Card className="p-6 space-y-3">
              <p className="text-sm font-semibold text-main">🕵️ Create your Shadow Identity</p>
              <p className="text-sm text-muted">
                Access Nest Shadow — anonymous code reviews with zero identity leakage.
              </p>
              <Link to="/shadow/create">
                <Button variant="primary" size="sm">Set Up Shadow Identity</Button>
              </Link>
            </Card>
          )}
        </div>
      )}

      {/* ── Appearance Tab ──────────────────────────────────────────────── */}
      {activeTab === 'appearance' && (
        <div className="space-y-5">
          <Card className="p-6 space-y-4">
            <div>
              <p className="text-sm font-semibold text-main mb-1">Feed & Landing Theme</p>
              <p className="text-xs text-muted mb-3">
                Switch between light and dark mode for the public feed. Nest Shadow is always dark.
              </p>
              <div className="flex items-center gap-3">
                <ThemeToggle showLabel />
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
