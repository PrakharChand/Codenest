import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { usersApi } from '../api/usersApi';
import { postsApi } from '../api/postsApi';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/atoms/Avatar';
import Badge from '../components/atoms/Badge';
import Button from '../components/atoms/Button';
import Card from '../components/atoms/Card';
import Spinner from '../components/atoms/Spinner';
import PaginatedList from '../components/organisms/PaginatedList';
import PostCard from '../components/organisms/PostCard';

export default function UserProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [isMutual, setIsMutual] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  const isSelf = currentUser && currentUser.id === parseInt(id, 10);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const data = await usersApi.getProfile(id);
        setProfile(data);
        setConnected(data.isConnected || false);
        setIsMutual(data.isMutual || false);
      } catch (err) {
        setError(err.message || 'Failed to load user profile.');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [id]);

  const handleToggleConnect = async () => {
    if (isSelf) return;
    setConnectLoading(true);
    try {
      if (connected) {
        await usersApi.disconnect(id);
        setConnected(false);
        setIsMutual(false);
      } else {
        await usersApi.connect(id);
        setConnected(true);
      }
    } catch (err) {
      alert(err.message || 'Action failed.');
    } finally {
      setConnectLoading(false);
    }
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
      {/* Profile Header Card */}
      <Card className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar src={profile.avatar_url} name={profile.name} size="lg" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-main">{profile.name}</h1>
                {isMutual && <Badge variant="primary" size="sm">Mutual Connection</Badge>}
              </div>
              <p className="text-xs text-subtle">
                Joined{' '}
                {profile.created_at
                  ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })
                  : 'recently'}
              </p>
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
                  variant={connected ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={handleToggleConnect}
                  isLoading={connectLoading}
                >
                  {connected ? 'Connected' : 'Connect'}
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
