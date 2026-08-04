import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usersApi } from '../api/usersApi';
import { useAuth } from '../context/AuthContext';
import UserCard from '../components/organisms/UserCard';
import Button from '../components/atoms/Button';
import Spinner from '../components/atoms/Spinner';
import Avatar from '../components/atoms/Avatar';
import Badge from '../components/atoms/Badge';
import Card from '../components/atoms/Card';
import { SkeletonCard } from '../components/atoms/Skeleton';
import SEO from '../components/atoms/SEO';


// ── Icons ─────────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
    <path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

// ── Debounce hook ─────────────────────────────────────────────────────────

function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Tab definitions ───────────────────────────────────────────────────────

const TABS = [
  { id: 'discover', label: 'Discover' },
  { id: 'requests', label: 'Requests' },
];

// ── RequestItem ───────────────────────────────────────────────────────────

function RequestItem({ req, type, onAccept, onDecline }) {
  const [actioning, setActioning] = useState(null); // 'accept' | 'decline'
  const [done, setDone] = useState(false);

  const handle = async (action) => {
    setActioning(action);
    try {
      if (action === 'accept') {
        await usersApi.acceptRequest(req.id);
        toast.success(`Connected with ${req.name}`);
      }
      if (action === 'decline') {
        await usersApi.declineRequest(req.id);
        toast.success('Request declined');
      }
      setDone(true);
      if (action === 'accept')  onAccept?.(req.id);
      if (action === 'decline') onDecline?.(req.id);
    } catch (err) {
      toast.error(err.message || 'Failed to update request');
      setActioning(null);
    }
  };

  if (done) return null;

  return (
    <Card elevation="flat" className="flex items-center gap-3 px-4 py-3">
      <Avatar src={req.avatar_url} name={req.name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-main)] truncate">{req.name}</p>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {type === 'incoming' ? 'wants to connect' : 'request pending'}
        </p>
      </div>
      {type === 'incoming' ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => handle('accept')}
            disabled={!!actioning}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
          >
            {actioning === 'accept' ? <Spinner size="sm" /> : <CheckIcon />}
            Accept
          </button>
          <button
            onClick={() => handle('decline')}
            disabled={!!actioning}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-main)] text-[var(--text-muted)] text-xs font-semibold hover:bg-[var(--bg-surface-hover)] transition-colors disabled:opacity-50"
          >
            {actioning === 'decline' ? <Spinner size="sm" /> : <XIcon />}
            Decline
          </button>
        </div>
      ) : (
        <Badge variant="warning" size="sm">Pending</Badge>
      )}
    </Card>
  );
}

// ── Main ExplorePage ──────────────────────────────────────────────────────

export default function ExplorePage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('discover');

  // ── Search state ───────────────────────────────────────────────────────
  const [query, setQuery] = useState(() => searchParams.get('q') || '');

  const debouncedQuery = useDebounce(query);
  const [searchResults, setSearchResults] = useState(null); // null = not searching
  const [searchLoading, setSearchLoading] = useState(false);
  const inputRef = useRef(null);

  // ── Explore (paginated) ────────────────────────────────────────────────
  const [explorePeople, setExplorePeople] = useState([]);
  const [exploreLoading, setExploreLoading] = useState(true);
  const [explorePage, setExplorePage] = useState(1);
  const [exploreHasNext, setExploreHasNext] = useState(false);
  const [exploreLoadingMore, setExploreLoadingMore] = useState(false);

  // ── Requests ───────────────────────────────────────────────────────────
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);

  // ── Load explore on mount ──────────────────────────────────────────────
  const loadExplore = useCallback(async (page = 1, append = false) => {
    if (page === 1) setExploreLoading(true);
    else setExploreLoadingMore(true);
    try {
      const res = await usersApi.explore({ page, limit: 12 });
      const people = res.data || res.results || [];
      setExplorePeople((prev) => append ? [...prev, ...people] : people);
      setExplorePage(page);
      setExploreHasNext(res.pagination?.hasNext || false);
    } catch {
      // fallback to empty
    } finally {
      setExploreLoading(false);
      setExploreLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadExplore(1);
  }, [loadExplore]);

  // ── Debounced search ───────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults(null);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    usersApi.search(debouncedQuery).then((res) => {
      if (!cancelled) {
        setSearchResults(res.results || res.data || []);
        setSearchLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setSearchResults([]);
        setSearchLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // ── Load requests ──────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'requests' || !user) return;
    setReqLoading(true);
    Promise.all([
      usersApi.listIncomingRequests().catch(() => ({ data: [] })),
      usersApi.listOutgoingRequests().catch(() => ({ data: [] })),
    ]).then(([inRes, outRes]) => {
      setIncoming(inRes.data || inRes.results || []);
      setOutgoing(outRes.data || outRes.results || []);
    }).finally(() => setReqLoading(false));
  }, [activeTab, user]);

  // ── Helpers ────────────────────────────────────────────────────────────
  const displayList = searchResults !== null ? searchResults : explorePeople;
  const isSearchMode = searchResults !== null;
  const incomingCount = incoming.length;

  return (
    <div className="space-y-8">
      <SEO
        title="Discover Developers & Connections"
        description="Explore software engineers on CodeNest, search developers by name or tech stack, and send connection requests."
      />

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--text-main)]">Explore Developers</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Discover coders, follow their work, and build your network
        </p>
      </div>

      {/* ── Search bar ──────────────────────────────────────────────── */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] pointer-events-none">
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, username…"
          className="
            w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)]
            pl-10 pr-10 py-3 text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)]
            transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30
            focus-visible:border-[var(--color-primary)]
            shadow-[var(--shadow-sm)]
          "
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setSearchResults(null); inputRef.current?.focus(); }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] hover:text-[var(--text-main)] transition-colors"
          >
            <XIcon />
          </button>
        )}
        {searchLoading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <Spinner size="sm" />
          </div>
        )}
      </div>

      {/* ── Tab bar (only when not searching) ───────────────────────── */}
      {!isSearchMode && user && (
        <div className="flex items-center gap-1 border-b border-[var(--border-main)]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative px-4 py-2.5 text-sm font-semibold transition-colors
                ${activeTab === tab.id
                  ? 'text-[var(--color-primary)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--color-primary)] after:rounded-t-full'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }
              `}
            >
              {tab.label}
              {tab.id === 'requests' && incomingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-primary)] text-[9px] font-bold text-white">
                  {incomingCount > 9 ? '9+' : incomingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Search results ───────────────────────────────────────────── */}
      {isSearchMode && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[var(--text-subtle)] uppercase tracking-wider">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{query}"
          </p>
          {searchResults.length === 0 && !searchLoading ? (
            <Card elevation="flat" className="py-12 text-center space-y-2">
              <div className="flex justify-center text-[var(--text-subtle)]"><UsersIcon /></div>
              <p className="font-semibold text-[var(--text-main)]">No developers found</p>
              <p className="text-sm text-[var(--text-muted)]">Try a different name or username</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {searchResults.map((u) => (
                <UserCard key={u.id} targetUser={u} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Discover tab ─────────────────────────────────────────────── */}
      {!isSearchMode && activeTab === 'discover' && (
        <div className="space-y-5">
          {exploreLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : displayList.length === 0 ? (
            <Card elevation="flat" className="py-16 text-center space-y-2">
              <div className="flex justify-center text-[var(--text-subtle)]"><UsersIcon /></div>
              <p className="font-semibold text-[var(--text-main)]">No developers to explore yet</p>
              <p className="text-sm text-[var(--text-muted)]">Be the first to join and invite others!</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayList.map((u) => (
                  <UserCard key={u.id} targetUser={u} />
                ))}
              </div>

              {/* Load more */}
              {exploreHasNext && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="secondary"
                    size="md"
                    isLoading={exploreLoadingMore}
                    onClick={() => loadExplore(explorePage + 1, true)}
                  >
                    Load more developers
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Requests tab ─────────────────────────────────────────────── */}
      {!isSearchMode && activeTab === 'requests' && (
        <div className="space-y-6">
          {reqLoading ? (
            <div className="flex justify-center py-10"><Spinner size="lg" /></div>
          ) : (
            <>
              {/* Incoming */}
              <section className="space-y-3">
                <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                  Incoming requests
                  {incomingCount > 0 && <Badge variant="primary">{incomingCount}</Badge>}
                </h2>
                {incoming.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] py-4">No pending incoming requests.</p>
                ) : (
                  <div className="space-y-2">
                    {incoming.map((req) => (
                      <RequestItem
                        key={req.id}
                        req={req}
                        type="incoming"
                        onAccept={(id) => setIncoming((prev) => prev.filter((r) => r.id !== id))}
                        onDecline={(id) => setIncoming((prev) => prev.filter((r) => r.id !== id))}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Outgoing */}
              <section className="space-y-3">
                <h2 className="text-sm font-bold text-[var(--text-main)]">Sent requests</h2>
                {outgoing.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] py-4">You haven't sent any connection requests yet.</p>
                ) : (
                  <div className="space-y-2">
                    {outgoing.map((req) => (
                      <RequestItem key={req.id} req={req} type="outgoing" />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
