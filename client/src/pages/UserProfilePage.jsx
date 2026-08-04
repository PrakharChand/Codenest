import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { usersApi } from '../api/usersApi';
import { postsApi } from '../api/postsApi';
import { useAuth } from '../context/AuthContext';
import { useConnection } from '../context/ConnectionContext';
import Avatar from '../components/atoms/Avatar';
import Badge from '../components/atoms/Badge';
import Button from '../components/atoms/Button';
import Card from '../components/atoms/Card';
import Spinner from '../components/atoms/Spinner';
import PaginatedList from '../components/organisms/PaginatedList';
import PostCard from '../components/organisms/PostCard';
import SEO from '../components/atoms/SEO';

export default function UserProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const {
    isFollowing,
    isMutual: getIsMutual,
    isActionLoading,
    toggleFollow,
    registerUserStatus,
  } = useConnection();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const numericId = parseInt(id, 10);
  const isSelf = currentUser && currentUser.id === numericId;

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const data = await usersApi.getProfile(id);
        setProfile(data);
        registerUserStatus(data);
      } catch (err) {
        setError(err.message || 'Failed to load user profile.');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [id, registerUserStatus]);

  const targetId = profile?.id || numericId;
  const following = isFollowing(targetId, profile?.isFollowing || false);
  const mutual = getIsMutual(targetId, profile?.isMutual || false);
  const followLoading = isActionLoading(targetId);

  const handleToggleFollow = async () => {
    if (isSelf || followLoading) return;
    await toggleFollow(profile || { id: targetId, name: profile?.name || 'user' });
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <Card className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-danger">User Not Found</h2>
        <p className="text-sm text-muted">{error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <SEO
        title={profile?.name ? `${profile.name} (@${profile.name.toLowerCase().replace(/\s+/g, '')})` : 'Developer Profile'}
        description={profile?.bio ? profile.bio : `View ${profile?.name || 'this developer'}'s profile, posts, code contributions, and connections on CodeNest.`}
      />
      {/* Profile Header Card */}
      <Card className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar src={profile.avatar_url} name={profile.name} size="lg" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-main">{profile.name}</h1>
                {mutual && <Badge variant="primary" size="sm">Mutual Connection</Badge>}

              </div>
              <p className="text-xs text-subtle">
                Joined{' '}
                {profile.created_at
                  ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })
                  : 'recently'}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <div className="text-xl font-extrabold text-main">{profile.postCount ?? 0}</div>
              <div className="text-xs text-subtle">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-extrabold text-main">{profile.followerCount ?? 0}</div>
              <div className="text-xs text-subtle">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-extrabold text-main">{profile.followingCount ?? 0}</div>
              <div className="text-xs text-subtle">Following</div>
            </div>
          </div>

          <div>
            {isSelf ? (
              <Link to="/settings/profile">
                <Button variant="secondary" size="sm">
                  Edit Profile
                </Button>
              </Link>
            ) : (
              currentUser && (
                <Button
                  variant={following ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={handleToggleFollow}
                  isLoading={followLoading}
                >
                  {following ? '✓ Following' : 'Follow'}
                </Button>
              )
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && <p className="text-sm text-muted">{profile.bio}</p>}

        {/* External Links */}
        <div className="flex flex-wrap gap-4 text-xs text-muted border-t border-main pt-4">
          {profile.github_url && (
            <a
              href={profile.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <span>🐱 GitHub:</span> <span className="underline">{profile.github_url}</span>
            </a>
          )}
          {profile.twitter_url && (
            <a
              href={profile.twitter_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <span>🐦 Twitter:</span> <span className="underline">{profile.twitter_url}</span>
            </a>
          )}
        </div>
      </Card>

      {/* User's Public Posts */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-main">Posts by {profile.name}</h2>
        <PaginatedList
          fetchData={(params) => postsApi.list({ ...params, author_id: id })}
          renderItem={(post) => <PostCard key={post.id} post={post} />}
          emptyTitle="No posts yet"
          emptyDescription="This user hasn't published any public posts yet."
        />
      </div>
    </div>
  );
}
