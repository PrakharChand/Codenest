import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth }   from '../context/AuthContext';
import { useConnection } from '../context/ConnectionContext';
import { useRelationship } from '../context/RelationshipContext';
import { usersApi }  from '../api/usersApi';
import Avatar        from '../components/atoms/Avatar';
import Badge         from '../components/atoms/Badge';
import Button        from '../components/atoms/Button';
import Card          from '../components/atoms/Card';
import Spinner       from '../components/atoms/Spinner';
import { SkeletonCard } from '../components/atoms/Skeleton';
import EmptyState    from '../components/molecules/EmptyState';
import SEO           from '../components/atoms/SEO';

// ────────────────────────────────────────────────────────────────────────────
// Icons
// ────────────────────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const UsersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const FollowersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MutualIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 3h5v5" /><path d="M4 20L21 3" />
    <path d="M21 16v5h-5" /><path d="M15 15l6 6" /><path d="M4 4l5 5" />
  </svg>
);

// ────────────────────────────────────────────────────────────────────────────
// Debounce hook
// ────────────────────────────────────────────────────────────────────────────

function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ────────────────────────────────────────────────────────────────────────────
// Tab definitions
// ────────────────────────────────────────────────────────────────────────────

const TABS = [
  {
    id: 'followers',
    label: 'Followers',
    icon: <FollowersIcon />,
    emptyTitle: 'No followers yet',
    emptyDesc: 'When someone follows you they will appear here.',
  },
  {
    id: 'following',
    label: 'Following',
    icon: <UsersIcon />,
    emptyTitle: "You're not following anyone",
    emptyDesc: 'Explore developers and hit Follow to start building your network.',
  },
  {
    id: 'mutual',
    label: 'Mutual',
    icon: <MutualIcon />,
    emptyTitle: 'No mutual connections',
    emptyDesc: 'Mutuals are people who follow you back. Keep growing your network!',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// ConnectionUserCard — compact row card (reuses Avatar, Badge, Button atoms)
// ────────────────────────────────────────────────────────────────────────────

function ConnectionUserCard({ targetUser, onFollowToggle }) {
  const { user: me } = useAuth();
  const { isFollowing: getIsFollowing, isMutual: getIsMutual, isActionLoading, toggleFollow } = useConnection();
  const { getUserRelationshipState } = useRelationship();

  const cachedRel = getUserRelationshipState(targetUser.id);
  const following = cachedRel?.isFollowing !== undefined
    ? cachedRel.isFollowing
    : getIsFollowing(targetUser.id, Boolean(targetUser.isFollowing ?? targetUser.isConnected ?? false));

  const mutual = getIsMutual(targetUser.id, Boolean(targetUser.isMutual ?? false)) || Boolean(targetUser.isMutual || targetUser.isConnected);
  const loading = isActionLoading(targetUser.id);

  const isSelf = me && me.id === targetUser.id;

  const handleFollow = async (e) => {
    e.preventDefault();
    if (isSelf || loading) return;
    await toggleFollow(targetUser);
    onFollowToggle?.(targetUser.id, !following);
  };

  return (
    <Card
      elevation="flat"
      hoverable
      className="flex items-center justify-between gap-4 px-4 py-4"
    >
      {/* Left: avatar + name + bio */}
      <Link
        to={`/users/${targetUser.id}`}
        className="flex items-center gap-3 flex-1 min-w-0 group"
        aria-label={`View ${targetUser.name}'s profile`}
      >
        <Avatar
          src={targetUser.avatar_url}
          name={targetUser.name}
          size="md"
          className="shrink-0 group-hover:ring-2 group-hover:ring-[var(--color-primary)] transition-all"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-[var(--text-main)] group-hover:text-[var(--color-primary)] transition-colors truncate">
              {targetUser.name}
            </span>
            {mutual && (
              <Badge variant="primary" size="sm">Mutual</Badge>
            )}
          </div>
          {targetUser.bio ? (
            <p className="text-xs text-[var(--text-muted)] truncate mt-0.5 leading-relaxed">
              {targetUser.bio}
            </p>
          ) : (
            <p className="text-xs text-[var(--text-subtle)] italic mt-0.5">No bio yet</p>
          )}
        </div>
      </Link>

      {/* Right: follow button */}
      {!isSelf && me && (
        <Button
          size="sm"
          variant={following ? 'secondary' : 'primary'}
          onClick={handleFollow}
          isLoading={loading}
          className="shrink-0"
          aria-label={following ? `Unfollow ${targetUser.name}` : `Follow ${targetUser.name}`}
        >
          {following ? '✓ Following' : 'Follow'}
        </Button>
      )}
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Loading skeleton grid (5 placeholder cards)
// ────────────────────────────────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading connections">
      {[1, 2, 3, 4, 5].map((n) => (
        <SkeletonCard key={n} />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Pagination controls
// ────────────────────────────────────────────────────────────────────────────

function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-[var(--border-main)] pt-4 text-sm text-[var(--text-muted)]">
      <span>
        Page {pagination.page} of {pagination.totalPages}{' '}
        <span className="text-[var(--text-subtle)]">({pagination.total} total)</span>
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          ← Previous
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!pagination.hasNext}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TabPanel — manages its own data, supports search + pagination
// ────────────────────────────────────────────────────────────────────────────

function TabPanel({ userId, tabId, emptyTitle, emptyDesc, searchQuery }) {
  const [data, setData]           = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const pageRef = useRef(1);

  const debouncedSearch = useDebounce(searchQuery, 350);

  // Pick fetcher by tab
  const fetcher = useCallback(
    (params) => {
      const base = { ...params };
      if (debouncedSearch) base.q = debouncedSearch;
      if (tabId === 'followers') return usersApi.listFollowers(userId, base);
      if (tabId === 'following') return usersApi.listFollowing(userId, base);
      if (tabId === 'mutual')    return usersApi.listMutual(userId, base);
    },
    [userId, tabId, debouncedSearch]
  );

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetcher({ page, limit: 20 });
        // Client-side filter for search (backend may not filter by name, search endpoint is separate)
        let rows = res.data ?? [];
        if (debouncedSearch) {
          const lc = debouncedSearch.toLowerCase();
          rows = rows.filter(
            (u) =>
              (u.name  && u.name.toLowerCase().includes(lc)) ||
              (u.bio   && u.bio.toLowerCase().includes(lc))
          );
        }
        setData(rows);
        setPagination(res.pagination ?? null);
        pageRef.current = page;
      } catch (err) {
        setError(err.message || 'Failed to load.');
      } finally {
        setLoading(false);
      }
    },
    [fetcher, debouncedSearch]
  );

  // Reload on tab switch or search change
  useEffect(() => {
    load(1);
  }, [load]);

  if (loading) return <TabSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/5 p-6 text-center space-y-3">
        <p className="text-sm font-medium text-[var(--color-danger)]">{error}</p>
        <Button size="sm" variant="secondary" onClick={() => load(pageRef.current)}>
          Retry
        </Button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<UsersIcon />}
        title={debouncedSearch ? `No results for "${debouncedSearch}"` : emptyTitle}
        description={debouncedSearch ? 'Try a different name or clear the search.' : emptyDesc}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {data.map((u) => (
          <ConnectionUserCard key={u.id} targetUser={u} />
        ))}
      </div>
      <Pagination pagination={pagination} onPageChange={load} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ConnectionsPage — top-level page
// ────────────────────────────────────────────────────────────────────────────

export default function ConnectionsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab]   = useState('followers');
  const [searchQuery, setSearchQuery] = useState('');

  if (!user) return null;

  const currentTab = TABS.find((t) => t.id === activeTab);

  return (
    <div className="space-y-6">
      <SEO
        title="Your Social Connections & Network"
        description="View and manage your followers, developers you follow, and mutual connections across CodeNest."
      />

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Connections</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage your followers, the developers you follow, and your mutual connections.
        </p>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Connection tabs"
        className="flex items-center gap-1 border-b border-[var(--border-main)] pb-0"
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
              }}
              className={[
                'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg',
                'border-b-2 -mb-px transition-all duration-150 select-none',
                isActive
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-dim)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)]',
              ].join(' ')}
            >
              <span className="shrink-0">{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Search bar ───────────────────────────────────────────────────── */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] pointer-events-none">
          <SearchIcon />
        </span>
        <input
          type="search"
          placeholder={`Search ${currentTab?.label.toLowerCase() ?? 'connections'}…`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search connections"
          className={[
            'w-full rounded-xl border bg-[var(--bg-surface)] py-2.5 pl-9 pr-3 text-sm',
            'text-[var(--text-main)] placeholder:text-[var(--text-subtle)]',
            'border-[var(--border-main)]',
            'transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[var(--color-primary)]/30 focus-visible:border-[var(--color-primary)]',
          ].join(' ')}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] hover:text-[var(--text-main)] transition-colors"
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Tab panel ────────────────────────────────────────────────────── */}
      {TABS.map((tab) => (
        <div
          key={tab.id}
          id={`tabpanel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== activeTab}
        >
          {tab.id === activeTab && (
            <TabPanel
              userId={user.id}
              tabId={tab.id}
              emptyTitle={tab.emptyTitle}
              emptyDesc={tab.emptyDesc}
              searchQuery={searchQuery}
            />
          )}
        </div>
      ))}
    </div>
  );
}
