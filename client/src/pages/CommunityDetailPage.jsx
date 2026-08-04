import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { communitiesApi } from '../api/communitiesApi';
import { useAuth } from '../context/AuthContext';
import Card from '../components/atoms/Card';
import Badge from '../components/atoms/Badge';
import Button from '../components/atoms/Button';
import Spinner from '../components/atoms/Spinner';
import Input from '../components/atoms/Input';
import TextArea from '../components/atoms/TextArea';
import PaginatedList from '../components/organisms/PaginatedList';
import PostCard from '../components/organisms/PostCard';

export default function CommunityDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  // Community Composer State
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function loadCommunity() {
      setLoading(true);
      setError(null);
      try {
        const data = await communitiesApi.get(id);
        setCommunity(data);
        setIsMember(data.is_member || false);
        setMemberCount(data.member_count || 0);
      } catch (err) {
        setError(err.message || 'Community not found.');
      } finally {
        setLoading(false);
      }
    }
    loadCommunity();
  }, [id]);

  const handleToggleJoin = async () => {
    if (!user) return;
    try {
      if (isMember) {
        setIsMember(false);
        setMemberCount((prev) => Math.max(prev - 1, 0));
        await communitiesApi.leave(id);
        toast.success('Left community');
      } else {
        setIsMember(true);
        setMemberCount((prev) => prev + 1);
        await communitiesApi.join(id);
        toast.success('Joined community');
      }
    } catch (err) {
      setIsMember(!isMember);
      toast.error(err.message || 'Failed to update membership');
    }
  };

  const handlePostInCommunity = async (e) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;

    setPosting(true);
    setPostError(null);
    try {
      await communitiesApi.postInCommunity(id, {
        title: postTitle.trim(),
        content: postContent.trim(),
      });
      setPostTitle('');
      setPostContent('');
      setRefreshTrigger((prev) => prev + 1);
      toast.success('Post published to community!');
    } catch (err) {
      setPostError(err.message || 'Failed to publish post in community.');
      toast.error(err.message || 'Failed to post in community.');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !community) {
    return (
      <Card className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-danger">Community Not Found</h2>
        <p className="text-sm text-muted">{error}</p>
        <Link to="/communities">
          <Button variant="secondary" size="sm">
            Back to Communities
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Card */}
      <Card className="p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-main">{community.name}</h1>
            <Badge variant="primary" size="sm">
              {memberCount} members
            </Badge>
          </div>

          {user && (
            <Button variant={isMember ? 'secondary' : 'primary'} size="sm" onClick={handleToggleJoin}>
              {isMember ? 'Joined' : 'Join Community'}
            </Button>
          )}
        </div>

        {community.description && <p className="text-sm text-muted">{community.description}</p>}
      </Card>

      {/* Post Composer — Members Only Rule */}
      {user ? (
        isMember ? (
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-main">Post in {community.name}</h3>
            {postError && <p className="text-xs text-danger font-medium">{postError}</p>}
            <form onSubmit={handlePostInCommunity} className="space-y-4">
              <Input
                placeholder="Post Title"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                required
              />
              <TextArea
                placeholder="What do you want to share with this community?"
                rows={3}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                required
              />
              <div className="flex justify-end">
                <Button type="submit" variant="primary" size="sm" isLoading={posting}>
                  Post in Community
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <div className="rounded-lg border border-main bg-surface-subtle p-6 text-center text-sm text-muted">
            Join <strong>{community.name}</strong> to create posts and join discussions in this community.
          </div>
        )
      ) : (
        <div className="rounded-lg border border-main bg-surface-subtle p-6 text-center text-sm text-muted">
          Please <Link to="/login" className="text-primary font-semibold hover:underline">sign in</Link> to view and participate in community posts.
        </div>
      )}

      {/* Community Feed */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-main">Community Feed</h2>
        <PaginatedList
          refreshTrigger={refreshTrigger}
          fetchData={(params) => communitiesApi.listPosts(id, params)}
          renderItem={(post) => <PostCard key={post.id} post={post} />}
          emptyTitle="No posts in this community yet"
          emptyDescription="Be the first member to share a post in this group!"
        />
      </div>
    </div>
  );
}
