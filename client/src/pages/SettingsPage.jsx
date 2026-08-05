/**
 * client/src/pages/SettingsPage.jsx
 *
 * Settings hub with tabs:
 *   - Account (profile info, shadow identity, danger zone with account deletion)
 *   - Appearance (theme preference)
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/usersApi';
import Card from '../components/atoms/Card';
import Button from '../components/atoms/Button';
import Avatar from '../components/atoms/Avatar';
import Input from '../components/atoms/Input';
import ThemeToggle from '../components/atoms/ThemeToggle';
import Modal from '../components/molecules/Modal';
import SEO from '../components/atoms/SEO';

const TABS = [
  { id: 'account',    label: '👤 Account' },
  { id: 'appearance', label: '🎨 Appearance' },
  { id: 'ai',         label: '⚙️ AI Settings' },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');

  // Danger Zone state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText]             = useState('');
  const [isDeleting, setIsDeleting]               = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleOpenDeleteModal = () => {
    setConfirmText('');
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return; // Prevent closing while deleting request is in-flight
    setIsDeleteModalOpen(false);
    setConfirmText('');
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE' || isDeleting) return;

    setIsDeleting(true);
    try {
      await usersApi.deleteAccount(user.id);
      toast.success('Account deleted successfully');
      setIsDeleteModalOpen(false);
      await logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SEO
        title="Account Settings & Preferences"
        description="Manage your CodeNest account settings, profile information, theme preferences, and shadow identity configuration."
        noIndex
      />
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

          {/* ── Danger Zone ─────────────────────────────────────────────── */}
          <div className="rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚨</span>
              <h2 className="text-base font-bold text-[var(--color-danger)]">Danger Zone</h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 border-t border-[var(--color-danger)]/20">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-main">Delete Account</p>
                <p className="text-xs text-muted leading-relaxed">
                  Permanently delete your account, posts, comments, connections, and anonymous shadow identity.
                  This action cannot be undone.
                </p>
              </div>

              <Button
                variant="danger"
                size="sm"
                onClick={handleOpenDeleteModal}
                className="shrink-0"
              >
                Delete Account
              </Button>
            </div>
          </div>
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

      {/* ── AI Settings Tab ─────────────────────────────────────────────── */}
      {activeTab === 'ai' && (
        <div className="space-y-5">
          <Card className="p-6 space-y-4">
            <div>
              <p className="text-sm font-semibold text-main mb-1">CodeNest Dual AI Assistants</p>
              <p className="text-xs text-muted mb-4">
                Configure intelligence models, RAG vector context sizes, and download chat backups for CodeNest Guide and Shadow Mentor.
              </p>
              <Link to="/settings/ai">
                <Button variant="primary" size="sm">
                  ⚙️ Open Full AI Configuration Panel →
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      )}

      {/* ── Delete Account Confirmation Modal ────────────────────────────── */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="⚠️ Confirm Account Deletion"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCloseDeleteModal}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteAccount}
              isLoading={isDeleting}
              disabled={confirmText !== 'DELETE' || isDeleting}
            >
              Delete Account Permanently
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-main">
          {/* Warning banner */}
          <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-3.5 text-xs text-[var(--color-danger)] space-y-1.5 font-medium">
            <p className="font-bold flex items-center gap-1.5">
              ⚠️ Danger: Irreversible Action
            </p>
            <p className="leading-relaxed opacity-90">
              Deleting your account is permanent. All your data will be immediately and irreversibly destroyed, including:
            </p>
            <ul className="list-disc list-inside space-y-0.5 opacity-90 pl-1">
              <li>Your public profile, email credentials, and avatar</li>
              <li>All your published posts, code snippets, and comments</li>
              <li>Your connections, follower count, and community memberships</li>
              <li>Your anonymous Shadow identity, submissions, and code reviews</li>
            </ul>
          </div>

          {/* Typing confirmation input */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-semibold text-main">
              To confirm deletion, please type <span className="font-mono text-[var(--color-danger)] font-bold">DELETE</span> below:
            </label>
            <Input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              disabled={isDeleting}
              autoComplete="off"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
