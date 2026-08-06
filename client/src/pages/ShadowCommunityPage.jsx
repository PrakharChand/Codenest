import React, { useState, useEffect } from 'react';
import { shadowApi } from '../api/shadowApi';
import { useAuth } from '../context/AuthContext';
import Card from '../components/atoms/Card';
import Avatar from '../components/atoms/Avatar';
import Button from '../components/atoms/Button';
import TextArea from '../components/atoms/TextArea';
import Badge from '../components/atoms/Badge';
import PaginatedList from '../components/organisms/PaginatedList';
import SEO from '../components/atoms/SEO';
import { formatDistanceToNow } from 'date-fns';

const SHADOW_TOPICS = [
  { id: 'all', label: 'All Discussions' },
  { id: 'Architecture', label: '🏗️ Architecture' },
  { id: 'System Design', label: '⚡ System Design' },
  { id: 'Code Quality', label: '🧹 Code Quality' },
  { id: 'Career', label: '💼 Career & Salary' },
];

function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

export default function ShadowCommunityPage() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('General');
  const [activeFilterTopic, setActiveFilterTopic] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await shadowApi.postToCommunity({
        content: content.trim(),
        topic: selectedTopic,
      });
      setContent('');
      setSelectedTopic('General');
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || 'Failed to post to anonymous community.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchParams = (params) => {
    const p = { ...params };
    if (debouncedSearch) p.search = debouncedSearch;
    if (activeFilterTopic !== 'all') p.topic = activeFilterTopic;
    return shadowApi.getCommunity(p);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SEO
        title="Anonymous Developer Community — Nest Shadow"
        description="Discuss technical topics, software architecture, and dev tools 100% anonymously."
      />

      {/* ── Page Header Card ────────────────────────────────────────────── */}
      <Card className="p-6 md:p-8 space-y-3 bg-gradient-to-r from-surface to-surface-subtle border-main">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-main font-mono">Anonymous Developer Community</h1>
              <Badge variant="primary" size="sm">🕵️ 100% Anonymous</Badge>
            </div>
            <p className="text-sm text-muted">
              Discuss technical topics, software architecture, and dev tools anonymously without social bias.
            </p>
          </div>
        </div>
      </Card>

      {/* ── Search & Topic Filters Bar ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-main">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none text-xs">
            🔍
          </span>
          <input
            type="search"
            placeholder="Search anonymous posts or technical insights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-subtle border border-main rounded-lg py-2 pl-9 pr-8 text-sm text-main placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle hover:text-main text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Topic Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full shrink-0">
          {SHADOW_TOPICS.map((topic) => (
            <button
              key={topic.id}
              onClick={() => setActiveFilterTopic(topic.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                activeFilterTopic === topic.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-subtle text-muted hover:text-main'
              }`}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Anonymous Post Composer ──────────────────────────────────────── */}
      {user && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-main">Post Anonymously</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-subtle font-semibold">Topic:</span>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="h-8 px-2.5 text-xs bg-surface-subtle border border-main rounded-lg text-main focus:outline-none focus:ring-2 focus:ring-primary/30 font-semibold"
              >
                <option value="General"># General</option>
                <option value="Architecture"># Architecture</option>
                <option value="System Design"># System Design</option>
                <option value="Code Quality"># Code Quality</option>
                <option value="Career"># Career & Salary</option>
              </select>
            </div>
          </div>

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

      {/* ── Anonymous Community Feed ─────────────────────────────────────── */}
      <PaginatedList
        key={`${debouncedSearch}-${activeFilterTopic}-${refreshTrigger}`}
        refreshTrigger={refreshTrigger}
        fetchData={fetchParams}
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
        emptyTitle={debouncedSearch ? `No anonymous posts match "${debouncedSearch}"` : "No posts in anonymous community yet"}
        emptyDescription={debouncedSearch ? "Try a different search term or topic filter." : "Be the first developer to start a discussion!"}
      />
    </div>
  );
}
