import React, { useState, useEffect } from 'react';
import { communitiesApi } from '../api/communitiesApi';
import { useAuth } from '../context/AuthContext';
import PaginatedList from '../components/organisms/PaginatedList';
import CommunityCard from '../components/organisms/CommunityCard';
import Button from '../components/atoms/Button';
import Input from '../components/atoms/Input';
import TextArea from '../components/atoms/TextArea';
import Modal from '../components/molecules/Modal';
import SEO from '../components/atoms/SEO';

function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

export default function CommunitiesPage() {
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'public' | 'private'
  const debouncedSearch = useDebounce(searchQuery, 350);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('public');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    if (!name.trim()) {
      setFieldErrors({ name: 'Community name is required.' });
      return;
    }

    setSubmitting(true);
    try {
      await communitiesApi.create({
        name: name.trim(),
        description: description.trim(),
        type,
      });
      setIsModalOpen(false);
      setName('');
      setDescription('');
      setType('public');
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      if (err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setFieldErrors({ name: err.message || 'Failed to create community.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fetchParams = (params) => {
    const p = { ...params };
    if (debouncedSearch) p.search = debouncedSearch;
    if (activeTab !== 'all') p.type = activeTab;
    return communitiesApi.list(p);
  };

  return (
    <div className="space-y-6">
      <SEO
        title="Developer Communities"
        description="Search and join interest-based developer communities on CodeNest."
      />

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-main">Developer Communities</h1>
          <p className="text-sm text-muted">Join interest-based groups to discuss code, architecture, and tools</p>
        </div>

        {user && (
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            + Create Community
          </Button>
        )}
      </div>

      {/* ── Search & Filter Bar ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-main">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none text-xs">
            🔍
          </span>
          <input
            type="search"
            placeholder="Search communities by name, topic, or description..."
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

        {/* Type filter tabs */}
        <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-lg border border-main w-full sm:w-auto shrink-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'public', label: '🌐 Public' },
            { id: 'private', label: '🔒 Private' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex-1 sm:flex-initial ${
                activeTab === tab.id
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-muted hover:text-main'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Communities Grid List ────────────────────────────────────────── */}
      <PaginatedList
        key={`${debouncedSearch}-${activeTab}-${refreshTrigger}`}
        refreshTrigger={refreshTrigger}
        fetchData={fetchParams}
        renderItem={(community) => <CommunityCard key={community.id} community={community} />}
        emptyTitle={debouncedSearch ? `No communities match "${debouncedSearch}"` : "No communities found"}
        emptyDescription={debouncedSearch ? "Try a different search term or clear filters." : "Be the first to start a developer community on CodeNest!"}
        emptyActionLabel={user ? "Create Community" : undefined}
        onEmptyAction={() => setIsModalOpen(true)}
      />

      {/* ── Create Community Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Community"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateCommunity} isLoading={submitting}>
              Create
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateCommunity} className="space-y-4">
          <Input
            label="Community Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
            placeholder="e.g. React & Next.js Developers"
            required
          />
          <TextArea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={fieldErrors.description}
            placeholder="What is this community about?"
            rows={3}
          />
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-main">Community Type</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
                  type === 'public'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-main bg-surface text-muted hover:border-subtle'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <input
                    type="radio"
                    name="type"
                    value="public"
                    checked={type === 'public'}
                    onChange={() => setType('public')}
                  />
                  🌐 Public
                </div>
                <span className="text-[11px] text-muted mt-1">Anyone can join instantly</span>
              </label>

              <label
                className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
                  type === 'private'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-main bg-surface text-muted hover:border-subtle'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <input
                    type="radio"
                    name="type"
                    value="private"
                    checked={type === 'private'}
                    onChange={() => setType('private')}
                  />
                  🔒 Private
                </div>
                <span className="text-[11px] text-muted mt-1">Approval required by admin</span>
              </label>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
