import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Avatar from '../atoms/Avatar';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import Card from '../atoms/Card';
import { usersApi } from '../../api/usersApi';
import { useAuth } from '../../context/AuthContext';

/**
 * UserCard — premium developer discovery card.
 *
 * Props:
 *   targetUser   — user object from /api/users/explore or /search
 *   onConnectToggle(id, newState) — optional callback after follow toggle
 *   compact      — narrower layout for sidebars/lists
 */
export default function UserCard({ targetUser, onConnectToggle, compact = false }) {
  const { user: currentUser } = useAuth();

  const [isFollowing, setIsFollowing] = useState(targetUser.isFollowing || targetUser.isConnected || false);
  const [isMutual,    setIsMutual]    = useState(targetUser.isMutual || false);
  const [reqSent,     setReqSent]     = useState(false);
  const [loadFollow,  setLoadFollow]  = useState(false);
  const [loadReq,     setLoadReq]     = useState(false);

  const isSelf = currentUser && currentUser.id === targetUser.id;

  // ── Follow / Unfollow ──────────────────────────────────────────────────
  const handleFollow = async (e) => {
    e.preventDefault();
    if (isSelf || loadFollow) return;
    setLoadFollow(true);
    try {
      if (isFollowing) {
        await usersApi.disconnect(targetUser.id);
        setIsFollowing(false);
        setIsMutual(false);
        toast.success(`Unfollowed ${targetUser.name}`);
      } else {
        await usersApi.connect(targetUser.id);
        setIsFollowing(true);
        toast.success(`Followed ${targetUser.name}`);
      }
      onConnectToggle?.(targetUser.id, !isFollowing);
    } catch (err) {
      toast.error(err.message || 'Failed to update follow status');
    } finally {
      setLoadFollow(false);
    }
  };

  // ── Connection Request ─────────────────────────────────────────────────
  const handleRequest = async (e) => {
    e.preventDefault();
    if (isSelf || loadReq || reqSent) return;
    setLoadReq(true);
    try {
      await usersApi.sendRequest(targetUser.id);
      setReqSent(true);
      toast.success(`Connection request sent to ${targetUser.name}`);
    } catch (err) {
      toast.error(err.message || 'Failed to send request');
    } finally {
      setLoadReq(false);
    }
  };

  const followerCount  = targetUser.followerCount  ?? targetUser.follower_count  ?? null;
  const followingCount = targetUser.followingCount ?? targetUser.following_count ?? null;
  const postCount      = targetUser.postCount      ?? targetUser.post_count      ?? null;

  if (compact) {
    // ── Compact row layout (for sidebars) ────────────────────────────────
    return (
      <Card elevation="flat" hoverable className="flex items-center justify-between gap-3 px-4 py-3">
        <Link to={`/users/${targetUser.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar src={targetUser.avatar_url} name={targetUser.name} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-[var(--text-main)] truncate">{targetUser.name}</p>
              {isMutual && <Badge variant="primary" size="sm">Mutual</Badge>}
            </div>
            {targetUser.bio && (
              <p className="text-xs text-[var(--text-muted)] truncate">{targetUser.bio}</p>
            )}
          </div>
        </Link>

        {!isSelf && currentUser && (
          <Button
            size="sm"
            variant={isFollowing ? 'ghost' : 'primary'}
            onClick={handleFollow}
            isLoading={loadFollow}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}
      </Card>
    );
  }

  // ── Full card layout (for explore grid) ───────────────────────────────
  return (
    <Card
      elevation="raised"
      className="flex flex-col gap-4 p-5 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Top: avatar + name + bio */}
      <Link to={`/users/${targetUser.id}`} className="flex items-start gap-3 group">
        <Avatar
          src={targetUser.avatar_url}
          name={targetUser.name}
          size="md"
          className="group-hover:ring-2 group-hover:ring-[var(--color-primary)] transition-all"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[var(--text-main)] group-hover:text-[var(--color-primary)] transition-colors truncate">
              {targetUser.name}
            </h3>
            {isMutual && <Badge variant="primary" size="sm">Mutual</Badge>}
            {reqSent   && <Badge variant="warning" size="sm">Request sent</Badge>}
          </div>
          {targetUser.bio ? (
            <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2 leading-relaxed">
              {targetUser.bio}
            </p>
          ) : (
            <p className="text-xs text-[var(--text-subtle)] mt-0.5 italic">No bio yet</p>
          )}
        </div>
      </Link>

      {/* Stats row */}
      {(followerCount !== null || followingCount !== null || postCount !== null) && (
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] border-t border-[var(--border-main)] pt-3">
          {followerCount !== null && (
            <span>
              <strong className="text-[var(--text-main)] font-bold">{followerCount}</strong>{' '}
              follower{followerCount !== 1 ? 's' : ''}
            </span>
          )}
          {followingCount !== null && (
            <span>
              <strong className="text-[var(--text-main)] font-bold">{followingCount}</strong>{' '}
              following
            </span>
          )}
          {postCount !== null && (
            <span>
              <strong className="text-[var(--text-main)] font-bold">{postCount}</strong>{' '}
              post{postCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      {!isSelf && currentUser && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant={isFollowing ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleFollow}
            isLoading={loadFollow}
            className="flex-1"
          >
            {isFollowing ? '✓ Following' : 'Follow'}
          </Button>
          {!reqSent ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRequest}
              isLoading={loadReq}
              className="flex-1"
              title="Send a connection request for mutual follow"
            >
              Connect
            </Button>
          ) : (
            <span className="flex-1 text-center text-xs text-[var(--text-subtle)] font-medium">
              Request pending
            </span>
          )}
        </div>
      )}

      {/* External links */}
      {(targetUser.github_url || targetUser.twitter_url) && (
        <div className="flex items-center gap-3 text-xs text-[var(--text-subtle)]">
          {targetUser.github_url && (
            <a
              href={targetUser.github_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hover:text-[var(--text-main)] transition-colors"
            >
              GitHub ↗
            </a>
          )}
          {targetUser.twitter_url && (
            <a
              href={targetUser.twitter_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hover:text-[var(--text-main)] transition-colors"
            >
              Twitter ↗
            </a>
          )}
        </div>
      )}
    </Card>
  );
}
