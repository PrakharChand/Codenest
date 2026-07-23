import React, { useState } from 'react';
import { shadowApi } from '../api/shadowApi';
import { useAuth } from '../context/AuthContext';
import Card from '../components/atoms/Card';
import Avatar from '../components/atoms/Avatar';
import Button from '../components/atoms/Button';
import TextArea from '../components/atoms/TextArea';
import PaginatedList from '../components/organisms/PaginatedList';
import { formatDistanceToNow } from 'date-fns';

export default function ShadowCommunityPage() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await shadowApi.postToCommunity({ content: content.trim() });
      setContent('');
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || 'Failed to post to anonymous community.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-main font-mono">Anonymous Developer Community</h1>
        <p className="text-sm text-muted">
          Discuss technical topics, software architecture, and dev tools anonymously.
        </p>
      </div>

      {/* Post Composer */}
      {user && (
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-main">Post Anonymously</h3>
          {error && <p className="text-xs text-danger font-medium">{error}</p>}

          <form onSubmit={handleCreatePost} className="space-y-3">
            <TextArea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What technical problem or architectural insight is on your mind?"
              required
            />
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                Post Anonymously
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Community Feed List */}
      <PaginatedList
        refreshTrigger={refreshTrigger}
        fetchData={(params) => shadowApi.getCommunity(params)}
        renderItem={(post) => (
          <Card key={post.id} className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar
                src={post.anonymous_avatar_url}
                name={post.anonymous_username || 'Anonymous'}
                size="sm"
              />
              <div>
                <span className="text-sm font-semibold font-mono text-main">
                  {post.anonymous_username || 'Anonymous'}
                </span>
                <span className="text-xs text-subtle block">
                  {post.created_at
                    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
                    : 'recently'}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted whitespace-pre-line leading-relaxed">
              {post.content}
            </p>
          </Card>
        )}
        emptyTitle="No posts in anonymous community yet"
        emptyDescription="Be the first developer to start a discussion!"
      />
    </div>
  );
}
