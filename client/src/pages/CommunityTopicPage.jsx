import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { communitiesApi } from '../api/communitiesApi';
import { useAuth } from '../context/AuthContext';
import { useRelationship } from '../context/RelationshipContext';
import Card from '../components/atoms/Card';
import Badge from '../components/atoms/Badge';
import Button from '../components/atoms/Button';
import Spinner from '../components/atoms/Spinner';
import Input from '../components/atoms/Input';
import TextArea from '../components/atoms/TextArea';
import PaginatedList from '../components/organisms/PaginatedList';
import PostCard from '../components/organisms/PostCard';
import SEO from '../components/atoms/SEO';

export default function CommunityTopicPage() {
  const { id, topicId } = useParams();
  const { user } = useAuth();
  const { getCommunityMembershipState } = useRelationship();

  const [topic, setTopic] = useState(null);
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Composer State
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const numericCommId = parseInt(id, 10);
  const cachedMembership = getCommunityMembershipState(numericCommId);
  const isMember = cachedMembership
    ? Boolean(cachedMembership.isMember)
    : Boolean(community?.is_member || community?.isMember);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [commData, topicData] = await Promise.all([
          communitiesApi.get(id),
          communitiesApi.getTopic(id, topicId),
        ]);
        setCommunity(commData);
        setTopic(topicData);
      } catch (err) {
        setError(err.message || 'Topic or Community not found.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, topicId]);

  const handlePostInTopic = async (e) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;

    setPosting(true);
    try {
      await communitiesApi.postInCommunity(id, {
        title: postTitle.trim(),
        content: postContent.trim(),
        topic_id: parseInt(topicId, 10),
      });
      setPostTitle('');
      setPostContent('');
      setRefreshTrigger((prev) => prev + 1);
      toast.success(`Published post in #${topic.name}!`);
    } catch (err) {
      toast.error(err.message || 'Failed to post in topic.');
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

  if (error || !topic || !community) {
    return (
      <Card className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-danger">Topic Not Found</h2>
        <p className="text-sm text-muted">{error}</p>
        <Link to={`/communities/${id}`}>
          <Button variant="secondary" size="sm">
            ← Back to Community
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SEO
        title={`${topic.name} — ${community.name}`}
        description={topic.description || `Discussions inside #${topic.name} topic.`}
      />

      {/* ── Breadcrumb & Navigation Header ────────────────────────────── */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-2 text-xs text-muted">
          <Link to="/communities" className="hover:text-primary transition-colors">
            Communities
          </Link>
          <span>›</span>
          <Link to={`/communities/${id}`} className="hover:text-primary transition-colors font-medium">
            {community.name}
          </Link>
          <span>›</span>
          <span className="text-main font-bold">#{topic.name}</span>
        </nav>

        <Link to={`/communities/${id}`}>
          <Button variant="secondary" size="sm">
            ← Back to {community.name}
          </Button>
        </Link>
      </div>

      {/* ── Topic Header Card ─────────────────────────────────────────── */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-main">#{topic.name}</h1>
            {topic.is_pinned && <Badge variant="warning" size="sm">📌 Pinned</Badge>}
            {topic.is_locked && <Badge variant="danger" size="sm">🔒 Locked</Badge>}
          </div>
          <Badge variant="primary" size="sm">
            💬 {topic.post_count || 0} posts
          </Badge>
        </div>

        {topic.description && <p className="text-sm text-muted">{topic.description}</p>}
      </Card>

      {/* ── Post Composer in Topic ───────────────────────────────────── */}
      {user ? (
        isMember ? (
          topic.is_locked ? (
            <div className="p-4 bg-danger/5 border border-danger/20 rounded-lg text-center text-xs text-danger font-medium">
              🔒 This topic is locked. New posts cannot be created.
            </div>
          ) : (
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-main">Start a Discussion in #{topic.name}</h3>
              <form onSubmit={handlePostInTopic} className="space-y-4">
                <Input
                  placeholder="Post Title"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  required
                />
                <TextArea
                  placeholder={`What do you want to discuss in #${topic.name}?`}
                  rows={3}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  required
                />
                <div className="flex justify-end">
                  <Button type="submit" variant="primary" size="sm" isLoading={posting}>
                    Post in Topic
                  </Button>
                </div>
              </form>
            </Card>
          )
        ) : (
          <div className="rounded-lg border border-main bg-surface-subtle p-6 text-center text-sm text-muted">
            Join <strong>{community.name}</strong> to post in #{topic.name}.
          </div>
        )
      ) : (
        <div className="rounded-lg border border-main bg-surface-subtle p-6 text-center text-sm text-muted">
          Please <Link to="/login" className="text-primary font-semibold hover:underline">sign in</Link> to participate in discussions.
        </div>
      )}

      {/* ── Topic Post Feed ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-main">Discussions</h3>
        <PaginatedList
          key={`${topicId}-${refreshTrigger}`}
          refreshTrigger={refreshTrigger}
          fetchData={(params) => communitiesApi.listTopicPosts(id, topicId, params)}
          renderItem={(post) => <PostCard key={post.id} post={post} />}
          emptyTitle={`No posts in #${topic.name} yet`}
          emptyDescription="Be the first to start a conversation in this topic!"
        />
      </div>
    </div>
  );
}
