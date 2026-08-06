import React, { useState, useEffect } from 'react';
import { shadowApi } from '../api/shadowApi';
import { useAuth } from '../context/AuthContext';
import Card from '../components/atoms/Card';
import Avatar from '../components/atoms/Avatar';
import Button from '../components/atoms/Button';
import Input from '../components/atoms/Input';
import TextArea from '../components/atoms/TextArea';
import Badge from '../components/atoms/Badge';
import Modal from '../components/molecules/Modal';
import PaginatedList from '../components/organisms/PaginatedList';
import SEO from '../components/atoms/SEO';
import toast from 'react-hot-toast';
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
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);
  const [activeFilterTopic, setActiveFilterTopic] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);

  // Anonymous Community Creation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [commName, setCommName] = useState('');
  const [commDesc, setCommDesc] = useState('');
  const [commType, setCommType] = useState('public');
  const [creatingComm, setCreatingComm] = useState(false);

  // Community List State
  const [shadowCommunities, setShadowCommunities] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function loadShadowCommunities() {
      try {
        const res = await shadowApi.listCommunities();
        setShadowCommunities(res.data || []);
      } catch (err) {
        // Silently swallow list error
      }
    }
    loadShadowCommunities();
  }, [refreshTrigger]);

  const handleCreateAnonCommunity = async (e) => {
    e.preventDefault();
    if (!commName.trim()) return;

    setCreatingComm(true);
    try {
      await shadowApi.createCommunity({
        name: commName.trim(),
        description: commDesc.trim(),
        type: commType,
      });
      toast.success(`Anonymous Community "${commName.trim()}" created!`);
      setIsModalOpen(false);
      setCommName('');
      setCommDesc('');
      setCommType('public');
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      toast.error(err.message || 'Failed to create anonymous community.');
    } finally {
      setCreatingComm(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await shadowApi.postToCommunity({
        content: content.trim(),
        topic: selectedTopic,
        community_id: selectedCommunityId,
      });
      setContent('');
      setSelectedTopic('General');
      setRefreshTrigger((prev) => prev + 1);
      toast.success('Anonymous post published!');
    } catch (err) {
      setError(err.message || 'Failed to post to anonymous community.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinCommunity = async (commId, commName) => {
    try {
      await shadowApi.joinCommunity(commId);
      toast.success(`Joined ${commName}!`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      toast.error(err.message || 'Failed to join community.');
    }
  };

  const handleLeaveCommunity = async (commId, commName) => {
    try {
      await shadowApi.leaveCommunity(commId);
      toast.success(`Left ${commName}`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      toast.error(err.message || 'Failed to leave community.');
    }
  };

  const fetchParams = (params) => {
    const p = { ...params };
    if (debouncedSearch) p.search = debouncedSearch;
    if (activeFilterTopic !== 'all') p.topic = activeFilterTopic;
    if (selectedCommunityId) p.community_id = selectedCommunityId;
    return shadowApi.getCommunity(p);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SEO
        title="Anonymous Developer Community — Nest Shadow"
        description="Create and join custom anonymous developer communities on Nest Shadow."
      />

      {/* ── Page Header Card ────────────────────────────────────────────── */}
      <Card className="p-6 md:p-8 space-y-3 bg-gradient-to-r from-surface to-surface-subtle border-main">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-main font-mono">Anonymous Developer Communities</h1>
              <Badge variant="primary" size="sm">🕵️ 100% Anonymous</Badge>
            </div>
            <p className="text-sm text-muted">
              Create and join custom anonymous developer groups to discuss code, salaries, and architecture without bias.
            </p>
          </div>

          {user && (
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              + Create Anon Community
            </Button>
          )}
        </div>
      </Card>

      {/* ── Custom Anonymous Communities Carousel / Bar ──────────────────── */}
      {shadowCommunities.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-main uppercase tracking-wider">
              Anonymous Groups ({shadowCommunities.length})
            </h3>
            {selectedCommunityId && (
              <button
                onClick={() => setSelectedCommunityId(null)}
                className="text-xs text-primary font-semibold hover:underline"
              >
                Clear Community Filter ✕
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {shadowCommunities.map((comm) => (
              <Card
                key={comm.id}
                hoverable
                onClick={() => setSelectedCommunityId(selectedCommunityId === comm.id ? null : comm.id)}
                className={`p-4 flex flex-col justify-between space-y-3 transition-all cursor-pointer ${
                  selectedCommunityId === comm.id
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : 'border-main'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-sm font-bold text-main truncate">{comm.name}</h4>
                    <Badge variant={comm.type === 'private' ? 'warning' : 'secondary'} size="sm">
                      {comm.type === 'private' ? '🔒 Private' : '🌐 Public'}
                    </Badge>
                  </div>
                  {comm.description && (
                    <p className="text-xs text-muted line-clamp-2">{comm.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-main text-xs">
                  <span className="text-subtle">👥 {comm.member_count || 1} members</span>
                  {comm.is_member ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLeaveCommunity(comm.id, comm.name);
                      }}
                    >
                      Joined ✓
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinCommunity(comm.id, comm.name);
                      }}
                    >
                      Join Group
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base font-bold text-main">Post Anonymously</h3>
            <div className="flex items-center gap-3">
              {shadowCommunities.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-subtle font-semibold">Group:</span>
                  <select
                    value={selectedCommunityId || ''}
                    onChange={(e) => setSelectedCommunityId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="h-8 px-2 text-xs bg-surface-subtle border border-main rounded-lg text-main focus:outline-none focus:ring-2 focus:ring-primary/30 font-semibold"
                  >
                    <option value="">🌐 Global Feed</option>
                    {shadowCommunities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5">
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
        key={`${debouncedSearch}-${activeFilterTopic}-${selectedCommunityId}-${refreshTrigger}`}
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

      {/* ── Create Anonymous Community Modal ────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Anonymous Developer Community"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateAnonCommunity} isLoading={creatingComm}>
              Create Group
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateAnonCommunity} className="space-y-4">
          <Input
            label="Community Name"
            value={commName}
            onChange={(e) => setCommName(e.target.value)}
            placeholder="e.g. Blind Salaries & Equity, System Architecture Rants"
            required
          />
          <TextArea
            label="Description"
            value={commDesc}
            onChange={(e) => setCommDesc(e.target.value)}
            placeholder="What should be discussed anonymously in this group?"
            rows={3}
          />
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-main">Community Access</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`p-3 rounded-lg border cursor-pointer ${commType === 'public' ? 'border-primary bg-primary/5' : 'border-main'}`}>
                <input type="radio" name="commType" value="public" checked={commType === 'public'} onChange={() => setCommType('public')} />
                <span className="font-bold text-xs ml-2">🌐 Public</span>
              </label>
              <label className={`p-3 rounded-lg border cursor-pointer ${commType === 'private' ? 'border-primary bg-primary/5' : 'border-main'}`}>
                <input type="radio" name="commType" value="private" checked={commType === 'private'} onChange={() => setCommType('private')} />
                <span className="font-bold text-xs ml-2">🔒 Private</span>
              </label>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
