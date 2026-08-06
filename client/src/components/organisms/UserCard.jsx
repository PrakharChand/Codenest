import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../atoms/Avatar';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import Card from '../atoms/Card';
import { useAuth } from '../../context/AuthContext';
import { useConnection } from '../../context/ConnectionContext';
import { useRelationship } from '../../context/RelationshipContext';

/**
 * UserCard — premium developer discovery card.
 */
export default function UserCard({ targetUser, onConnectToggle, compact = false }) {
  const { user: currentUser } = useAuth();
  const {
    isFollowing: getIsFollowing,
    isMutual: getIsMutual,
    getRequestStatus,
    isActionLoading,
    toggleFollow,
    sendConnectionRequest,
  } = useConnection();
  const { getUserRelationshipState } = useRelationship();

  const isSelf = currentUser && currentUser.id === targetUser.id;
  const cachedRel = getUserRelationshipState(targetUser.id);

  const following = cachedRel?.isFollowing !== undefined
    ? cachedRel.isFollowing
    : getIsFollowing(targetUser.id, Boolean(targetUser.isFollowing || targetUser.isConnected || targetUser.isMutual));

  const isConnected = cachedRel?.isConnected !== undefined
    ? cachedRel.isConnected
    : Boolean(targetUser.isConnected || (targetUser.isFollowing && targetUser.followsMe));

  const mutual = getIsMutual(targetUser.id, Boolean(targetUser.isMutual)) || isConnected || (following && targetUser.followsMe);

  const connectionStatus = cachedRel?.connectionStatus || targetUser.connectionStatus || (isConnected || mutual ? 'connected' : following ? 'following' : 'none');

  const reqStatus = getRequestStatus(targetUser.id);
  const reqSent = connectionStatus === 'pending_outgoing' || reqStatus === 'outgoing';
  const loadAction = isActionLoading(targetUser.id);

  // ── Follow / Unfollow ──────────────────────────────────────────────────
  const handleFollow = async (e) => {
    e.preventDefault();
    if (isSelf || loadAction) return;
    await toggleFollow(targetUser);
    onConnectToggle?.(targetUser.id, !following);
  };

  // ── Connection Request ─────────────────────────────────────────────────
  const handleRequest = async (e) => {
    e.preventDefault();
    if (isSelf || loadAction || reqSent || isConnected || mutual) return;
    await sendConnectionRequest(targetUser);
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
              {mutual && <Badge variant="primary" size="sm">Mutual</Badge>}
            </div>
            {targetUser.bio && (
              <p className="text-xs text-[var(--text-muted)] truncate">{targetUser.bio}</p>
            )}
          </div>
        </Link>

        {!isSelf && currentUser && (
          <Button
            size="sm"
            variant={following ? 'secondary' : 'primary'}
            onClick={handleFollow}
            isLoading={loadAction}
          >
            {following ? '✓ Following' : 'Follow'}
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
            {mutual  && <Badge variant="primary" size="sm">Mutual</Badge>}
            {reqSent && <Badge variant="warning" size="sm">Request sent</Badge>}
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
            variant={following ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleFollow}
            isLoading={loadAction}
            className="flex-1"
          >
            {following ? '✓ Following' : 'Follow'}
          </Button>

          {isConnected || mutual ? (
            <Badge variant="primary" size="sm" className="flex-1 text-center py-1.5 justify-center">
              ✓ Connected
            </Badge>
          ) : reqSent ? (
            <span className="flex-1 text-center text-xs text-[var(--text-subtle)] font-medium py-1.5">
              Request pending ⏳
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRequest}
              isLoading={loadAction}
              className="flex-1"
              title="Send a connection request for mutual follow"
            >
              Connect
            </Button>
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
