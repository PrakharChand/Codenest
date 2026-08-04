/**
 * client/src/components/organisms/OnboardingModal.jsx
 *
 * 3-Step Interactive Onboarding Flow for new developers:
 *  - Step 1: Pick at least 3 tech tags from predefined list
 *  - Step 2: Suggest 3–5 recommended developers to follow
 *  - Step 3: Prompt user to write their first post with placeholder
 *
 * Automatically pops up for new registered users where is_onboarded is false.
 * Stamps is_onboarded = true via server API on completion/skip and never shows again.
 */

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../api/usersApi';
import { postsApi } from '../../api/postsApi';
import Modal from '../molecules/Modal';
import Button from '../atoms/Button';
import Avatar from '../atoms/Avatar';
import Spinner from '../atoms/Spinner';

const PREDEFINED_TAGS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'Go', 'Rust',
  'PostgreSQL', 'System Design', 'DevOps', 'Docker', 'Tailwind CSS',
  'C++', 'Java', 'Next.js'
];

export default function OnboardingModal() {
  const { user, setUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1 State: Tech Tags (min 3)
  const [selectedTags, setSelectedTags] = useState([]);

  // Step 2 State: Suggested Developers to Follow
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers]     = useState(false);
  const [followedIds, setFollowedIds]       = useState(new Set());

  // Step 3 State: First Post
  const [postTitle, setPostTitle]     = useState('');
  const [postContent, setPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automatically trigger modal for new users who have not completed onboarding
  useEffect(() => {
    if (user && !user.is_onboarded && !user.onboarding_completed_at) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [user]);

  // Load suggested developers when entering Step 2
  useEffect(() => {
    if (step === 2 && suggestedUsers.length === 0) {
      async function loadSuggestions() {
        setLoadingUsers(true);
        try {
          const res = await usersApi.explore({ limit: 5 });
          const usersList = (res.data || res.users || []).filter((u) => u.id !== user?.id).slice(0, 5);
          setSuggestedUsers(usersList);
        } catch (err) {
          // Fallback silently
        } finally {
          setLoadingUsers(false);
        }
      }
      loadSuggestions();
    }
  }, [step, suggestedUsers.length, user?.id]);

  if (!isOpen || !user) return null;

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleFollowUser = async (targetId) => {
    try {
      await usersApi.connect(targetId);
      setFollowedIds((prev) => new Set([...prev, targetId]));
      toast.success('Followed user!');
    } catch (err) {
      toast.error('Failed to follow.');
    }
  };

  const markOnboardingComplete = async () => {
    try {
      await usersApi.completeOnboarding();
    } catch (err) {
      // Ignore API errors
    } finally {
      // Update local auth context user
      setUser((prev) => (prev ? { ...prev, is_onboarded: true, onboarding_completed_at: new Date().toISOString() } : prev));
      setIsOpen(false);
    }
  };

  const handleSkipOrFinish = async () => {
    toast.success('Welcome to CodeNest! 🎉');
    await markOnboardingComplete();
  };

  const handleCreateFirstPost = async () => {
    if (!postContent.trim()) {
      await handleSkipOrFinish();
      return;
    }

    setIsSubmitting(true);
    try {
      await postsApi.create({
        title: postTitle.trim() || 'My First Post on CodeNest 🚀',
        content: postContent.trim(),
        tags: selectedTags,
      });
      toast.success('First post published! 🎉');
    } catch (err) {
      toast.error('Could not publish post, but completing setup.');
    } finally {
      setIsSubmitting(false);
      await markOnboardingComplete();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Non-dismissable by clicking backdrop to ensure clean completion
      title={`🚀 Welcome to CodeNest! (Step ${step} of 3)`}
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipOrFinish}
            disabled={isSubmitting}
            className="text-muted hover:text-main"
          >
            Skip Onboarding
          </Button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setStep(step - 1)}
                disabled={isSubmitting}
              >
                Back
              </Button>
            )}

            {step === 1 && (
              <Button
                variant="primary"
                size="sm"
                disabled={selectedTags.length < 3}
                onClick={() => setStep(2)}
              >
                Next ({selectedTags.length}/3 tags selected)
              </Button>
            )}

            {step === 2 && (
              <Button variant="primary" size="sm" onClick={() => setStep(3)}>
                Next
              </Button>
            )}

            {step === 3 && (
              <Button
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                onClick={handleCreateFirstPost}
              >
                {postContent.trim() ? 'Publish & Start' : 'Finish Setup'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1 text-main">
        {/* ── STEP 1: Select Tech Tags ───────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-main">What technologies interest you?</h3>
              <p className="text-xs text-muted mt-0.5">
                Pick at least <strong className="text-primary font-semibold">3 topics</strong> to personalize your developer feed.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {PREDEFINED_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                      isSelected
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs scale-105'
                        : 'bg-[var(--bg-surface)] text-muted border-[var(--border-main)] hover:border-[var(--color-primary)]/50 hover:text-main'
                    }`}
                  >
                    {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 2: Suggested Developers ──────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-main">Follow engineers matching your stack</h3>
              <p className="text-xs text-muted mt-0.5">
                Connect with active developers to build your network feed.
              </p>
            </div>

            {loadingUsers ? (
              <div className="py-8 text-center flex justify-center">
                <Spinner size="md" />
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {suggestedUsers.map((sUser) => {
                  const isFollowed = followedIds.has(sUser.id);
                  return (
                    <div
                      key={sUser.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={sUser.avatar_url} name={sUser.name} size="md" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-main truncate">{sUser.name}</p>
                          <p className="text-[11px] text-muted truncate">{sUser.bio || 'Software Developer'}</p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isFollowed ? 'secondary' : 'primary'}
                        onClick={() => handleFollowUser(sUser.id)}
                        disabled={isFollowed}
                        className="shrink-0"
                      >
                        {isFollowed ? '✓ Following' : 'Follow'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Write First Post ───────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-main">Write your first community post</h3>
              <p className="text-xs text-muted mt-0.5">
                Say hello to CodeNest developers or share what you are working on!
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Title (e.g. Hello CodeNest! Working on Rust & React)"
                className="w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs text-main placeholder:text-muted focus:outline-none focus:border-primary"
              />

              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                rows={4}
                placeholder="Share a code snippet, architectural insight, or what you're learning today..."
                className="w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-3text-xs text-main placeholder:text-muted focus:outline-none focus:border-primary resize-none text-xs"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
