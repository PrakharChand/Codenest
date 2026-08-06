import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { shadowApi } from '../api/shadowApi';
import { useAuth } from '../context/AuthContext';
import Card from '../components/atoms/Card';
import Badge from '../components/atoms/Badge';
import Button from '../components/atoms/Button';
import Spinner from '../components/atoms/Spinner';
import TextArea from '../components/atoms/TextArea';
import Avatar from '../components/atoms/Avatar';
import PaginatedList from '../components/organisms/PaginatedList';
import SEO from '../components/atoms/SEO';
import { formatDistanceToNow } from 'date-fns';

export default function ShadowCommunityDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Composer State
  const [content, setContent] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('General');
  const [posting, setPosting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function loadCommunity() {
      setLoading(true);
      setError(null);
      try {
        const res = await shadowApi.listCommunities();
        const found = res.data?.find((c) => c.id === parseInt(id, 10));
        if (!found) throw new Error('Anonymous Community not found.');
        setCommunity(found);
      } catch (err) {
        setError(err.message || 'Failed to load anonymous community.');
      } finally {
        setLoading(false);
      }
    }
    loadCommunity();
  }, [id, refreshTrigger]);

  const handleToggleJoin = async () => {
    if (!community) return;

    try {
      if (community.is_member) {
        await shadowApi.leaveCommunity(id);
        toast.success(`Left ${community.name}`);
        setCommunity((prev) => ({
          ...prev,
          is_member: false,
          member_count: Math.max((prev.member_count || 1) - 1, 0),
        }));
      } else {
        await shadowApi.joinCommunity(id);
        toast.success(`Joined ${community.name}!`);
        setCommunity((prev) => ({
          ...prev,
          is_member: true,
          member_count: (prev.member_count || 0) + 1,
        }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update membership.');
    }
  };

  const handlePostInCommunity = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setPosting(true);
    try {
      await shadowApi.postToCommunity({
        content: content.trim(),
        topic: selectedTopic,
        community_id: parseInt(id, 10),
      });
      setContent('');
      setSelectedTopic('General');
      setRefreshTrigger((prev) => prev + 1);
      toast.success('Anonymous post published to group!');
    } catch (err) {
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
      <Card className="p-8 text-center space-y-4 max-w-xl mx-auto">
        <h2 className="text-lg font-bold text-danger">Anonymous Community Not Found</h2>
        <p className="text-sm text-muted">{error}</p>
        <Link to="/shadow/community">
          <Button variant="secondary" size="sm">
            ← Back to Anonymous Communities
          </Button>
        </Link>
      </Card>
    );
  }

  const isPrivate = community.type === 'private';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SEO title={`${community.name} — Nest Shadow`} description={community.description} />

      {/* ── Navigation Header & Breadcrumb ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-2 text-xs text-muted font-mono">
          <Link to="/shadow/community" className="hover:text-primary transition-colors">
            Anon Communities
          </Link>
          <span>›</span>
          <span className="text-main font-bold">{community.name}</span>
        </nav>

        <Link to="/shadow/community">
          <Button variant="secondary" size="sm">
            ← Back to Anonymous Communities
          </Button>
        </Link>
      </div>

      {/* ── Community Header Card ─────────────────────────────────────── */}
      <Card className="p-6 md:p-8 space-y-4 bg-gradient-to-r from-surface to-surface-subtle border-main">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-main font-mono">{community.name}</h1>
              <Badge variant={isPrivate ? 'warning' : 'secondary'} size="sm">
                {isPrivate ? '🔒 Private' : '🌐 Public'}
              </Badge>
              <Badge variant="primary" size="sm">🕵️ 100% Anonymous</Badge>
            </div>

            {community.description && <p className="text-sm text-muted">{community.description}</p>}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Badge variant="default" size="sm">
              👥 {community.member_count || 1} member{community.member_count !== 1 ? 's' : ''}
            </Badge>

            {user && (
              <Button
                size="sm"
                variant={community.is_member ? 'secondary' : 'primary'}
                onClick={handleToggleJoin}
              >
                {community.is_member ? 'Joined ✓ (Leave)' : 'Join Anonymous Group'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ── Post Composer inside this Anonymous Group ───────────────────── */}
      {user && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-main">Post Anonymously in {community.name}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-subtle font-semibold">Topic:</span>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="h-8 px-2 text-xs bg-surface-subtle border border-main rounded-lg text-main focus:outline-none focus:ring-2 focus:ring-primary/30 font-semibold"
              >
                <option value="General"># General</option>
                <option value="Architecture"># Architecture</option>
                <option value="System Design"># System Design</option>
                <option value="Code Quality"># Code Quality</option>
                <option value="Career"># Career & Salary</option>
              </select>
            </div>
          </div>

          <form onSubmit={handlePostInCommunity} className="space-y-3">
            <TextArea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Share an anonymous technical insight with ${community.name}...`}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" isLoading={posting}>
                Publish Anonymous Post
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Anonymous Posts Feed inside this Community ─────────────────── */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-main">Group Discussions</h3>
        <PaginatedList
          key={`${id}-${refreshTrigger}`}
          refreshTrigger={refreshTrigger}
          fetchData={(params) => shadowApi.getCommunity({ ...params, community_id: id })}
          renderItem={(post) => (
            <Card key={post.id} className="p-5 space-y-3 hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={post.author_anonymous_avatar_url || post.anonymous_avatar_url}
                    name={post.author_anonymous_username || post.anonymous_username || 'Anonymous'}
                    size="sm"
                  />
                  <div>
                    <span className="text-sm font-semibold font-mono text-main">
                      {post.author_anonymous_username || post.anonymous_username || 'Anonymous'}
                    </span>
                    <span className="text-xs text-subtle block">
                      {post.created_at
                        ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
                        : 'recently'}
                    </span>
                  </div>
                </div>

                <Badge variant="secondary" size="sm">
                  🕵️ Shadow Post
                </Badge>
              </div>
              <p className="text-sm text-muted whitespace-pre-line leading-relaxed">
                {post.content}
              </p>
            </Card>
          )}
          emptyTitle={`No discussions in ${community.name} yet`}
          emptyDescription="Be the first developer to start an anonymous discussion in this group!"
        />
      </div>
    </div>
  );
}
