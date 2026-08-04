/**
 * ShadowQueuePage.jsx
 *
 * Review queue with production-ready language filtering.
 *
 * Features:
 *  - Language dropdown populated from server-side distinct values
 *    (only shows languages that actually have reviewable submissions).
 *  - Searchable dropdown when language list is long (>= 6 options).
 *  - Filter stored in URL via ?language= query param (useSearchParams).
 *  - Paginated list re-fetches when filter or page changes.
 *  - Loading skeleton for both the language dropdown and the queue list.
 *  - Contextual empty state when no results match the active filter.
 *
 * SECURITY NOTE: This page is Shadow-only.
 * Imports ONLY from shadowApi — never postsApi / usersApi.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { shadowApi } from '../api/shadowApi';
import PaginatedList    from '../components/organisms/PaginatedList';
import SubmissionCard   from '../components/organisms/SubmissionCard';
import Button           from '../components/atoms/Button';
import Skeleton         from '../components/atoms/Skeleton';
import SEO              from '../components/atoms/SEO';

// ─────────────────────────────────────────────────────────────────────────────
// Inline SVG icons (no external dep)
// ─────────────────────────────────────────────────────────────────────────────

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const CodeIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Language colour map — gives each language a subtle accent tint
// ─────────────────────────────────────────────────────────────────────────────

const LANG_COLORS = {
  javascript:  '#F7DF1E',
  typescript:  '#3178C6',
  python:      '#3572A5',
  java:        '#B07219',
  'c++':       '#f34b7d',
  'c#':        '#178600',
  go:          '#00ADD8',
  rust:        '#DEA584',
  ruby:        '#701516',
  php:         '#4F5D95',
  swift:       '#F05138',
  kotlin:      '#A97BFF',
  dart:        '#00B4AB',
  scala:       '#DC322F',
  r:           '#198CE7',
  shell:       '#89E051',
  bash:        '#89E051',
  html:        '#E34C26',
  css:         '#563D7C',
  sql:         '#e38c00',
  c:           '#555555',
};

function langDot(lang) {
  return LANG_COLORS[lang?.toLowerCase()] || 'var(--color-primary)';
}

// ─────────────────────────────────────────────────────────────────────────────
// Debounce hook — used for dropdown search input
// ─────────────────────────────────────────────────────────────────────────────

function useDebounce(value, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─────────────────────────────────────────────────────────────────────────────
// LanguageFilter — searchable dropdown
// ─────────────────────────────────────────────────────────────────────────────

function LanguageFilter({ languages, loading, value, onChange }) {
  const [open, setOpen]           = useState(false);
  const [search, setSearch]       = useState('');
  const debouncedSearch           = useDebounce(search, 150);
  const dropdownRef               = useRef(null);
  const searchRef                 = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus search input when opening
  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const filteredLanguages = useMemo(() => {
    if (!debouncedSearch) return languages;
    const lc = debouncedSearch.toLowerCase();
    return languages.filter((l) => l.toLowerCase().includes(lc));
  }, [languages, debouncedSearch]);

  // Only show search input when there are many languages
  const showSearch = languages.length >= 6;

  // Display label
  const displayLabel = value
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : 'All Languages';

  // Skeleton while loading
  if (loading) {
    return <Skeleton height="36px" width="180px" rounded="rounded-xl" />;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter by language"
        className={[
          'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold',
          'border transition-all duration-150 select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30',
          value
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
            : 'border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--color-primary)]',
        ].join(' ')}
      >
        {value && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: langDot(value) }}
            aria-hidden="true"
          />
        )}
        {!value && <FilterIcon />}
        <span>{displayLabel}</span>
        <ChevronDownIcon />
      </button>

      {/* Clear active filter chip */}
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear language filter"
          className={[
            'ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold',
            'text-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] transition-colors',
          ].join(' ')}
        >
          <XIcon />
        </button>
      )}

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          aria-label="Language options"
          className={[
            'absolute left-0 top-full mt-1.5 z-50',
            'w-56 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)]',
            'shadow-[var(--shadow-lg)] overflow-hidden',
            'animate-[fadeSlideDown_0.12s_ease]',
          ].join(' ')}
        >
          {/* Search inside dropdown */}
          {showSearch && (
            <div className="px-2.5 pt-2.5 pb-1.5 border-b border-[var(--border-main)]">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] pointer-events-none">
                  <SearchIcon />
                </span>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search language…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={[
                    'w-full pl-7 pr-2.5 py-1.5 text-xs rounded-lg',
                    'bg-[var(--bg-base)] border border-[var(--border-main)]',
                    'text-[var(--text-main)] placeholder:text-[var(--text-subtle)]',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]',
                  ].join(' ')}
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <ul className="py-1 max-h-64 overflow-y-auto" role="presentation">
            {/* "All" option */}
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
                className={[
                  'w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors',
                  !value
                    ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)] font-semibold'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-main)]',
                ].join(' ')}
              >
                <span className="w-2 h-2 rounded-full shrink-0 border border-[var(--border-main)]" />
                All Languages
              </button>
            </li>

            {filteredLanguages.length === 0 ? (
              <li className="px-3.5 py-3 text-xs text-[var(--text-subtle)] text-center italic">
                No matching languages
              </li>
            ) : (
              filteredLanguages.map((lang) => {
                const isActive = value === lang;
                const label = lang.charAt(0).toUpperCase() + lang.slice(1);
                return (
                  <li key={lang}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => { onChange(lang); setOpen(false); setSearch(''); }}
                      className={[
                        'w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)] font-semibold'
                          : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-main)]',
                      ].join(' ')}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: langDot(lang) }}
                        aria-hidden="true"
                      />
                      {label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ShadowQueuePage — main export
// ─────────────────────────────────────────────────────────────────────────────

export default function ShadowQueuePage() {
  const navigate = useNavigate();

  // ── URL param sync ──────────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const languageFromUrl = (searchParams.get('language') || '').toLowerCase();

  // ── Language dropdown state ─────────────────────────────────────────────
  const [languages, setLanguages]       = useState([]);
  const [langsLoading, setLangsLoading] = useState(true);

  // ── PaginatedList refresh trigger ───────────────────────────────────────
  // Bumped every time the language filter changes so PaginatedList re-fetches
  // from page 1 without unmounting.
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Track previous filter value so we only bump the trigger when it changes
  const prevLangRef = useRef(languageFromUrl);

  useEffect(() => {
    if (prevLangRef.current !== languageFromUrl) {
      prevLangRef.current = languageFromUrl;
      setRefreshTrigger((n) => n + 1);
    }
  }, [languageFromUrl]);

  // ── Fetch available languages on mount ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLangsLoading(true);
    shadowApi.getQueueLanguages()
      .then(({ languages: langs }) => {
        if (!cancelled) setLanguages(langs);
      })
      .catch(() => {
        // Non-fatal — filter still works, just no options in dropdown
        if (!cancelled) setLanguages([]);
      })
      .finally(() => {
        if (!cancelled) setLangsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // ── Filter change handler ───────────────────────────────────────────────
  const handleLanguageChange = useCallback((lang) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (lang) {
        next.set('language', lang);
      } else {
        next.delete('language');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // ── Stable fetchData for PaginatedList ─────────────────────────────────
  // Must be stable across re-renders to avoid infinite loops.
  // We capture languageFromUrl in a ref so the callback reference stays
  // the same while still reading the latest value.
  const langRef = useRef(languageFromUrl);
  langRef.current = languageFromUrl;

  const fetchQueue = useCallback((params) => {
    const apiParams = { ...params };
    if (langRef.current) {
      apiParams.language = langRef.current;
    }
    return shadowApi.getQueue(apiParams);
  }, []); // intentionally empty deps — reads via ref

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const emptyTitle = languageFromUrl
    ? `No ${languageFromUrl.charAt(0).toUpperCase() + languageFromUrl.slice(1)} submissions in the queue`
    : 'The review queue is currently empty!';

  const emptyDescription = languageFromUrl
    ? `There are no reviewable ${languageFromUrl} submissions right now. Try a different language or clear the filter.`
    : "You've reviewed all available submissions or no new submissions exist. Why not submit your own code for review?";

  return (
    <div className="space-y-6">
      <SEO
        title="Anonymous Code Review Queue — Nest Shadow"
        description="Review anonymous code submissions from developers worldwide. Pure code analysis with zero identity bias on Nest Shadow."
      />

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] font-mono">
            Code Review Queue
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Review submissions from developers anonymously. Pure code, zero bias.
          </p>
        </div>

        <Link to="/shadow/submissions/new">
          <Button variant="primary" size="sm">
            + Submit Code for Review
          </Button>
        </Link>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <LanguageFilter
          languages={languages}
          loading={langsLoading}
          value={languageFromUrl}
          onChange={handleLanguageChange}
        />

        {/* Active filter pill */}
        {languageFromUrl && (
          <span
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]"
            aria-live="polite"
          >
            Showing
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background: langDot(languageFromUrl) + '22',
                color: langDot(languageFromUrl),
                border: `1px solid ${langDot(languageFromUrl)}44`,
              }}
            >
              {languageFromUrl.charAt(0).toUpperCase() + languageFromUrl.slice(1)}
            </span>
            submissions only
          </span>
        )}
      </div>

      {/* ── Queue list ─────────────────────────────────────────────────── */}
      <PaginatedList
        key={languageFromUrl} // force full remount when filter changes (resets page to 1)
        preset="shadow"
        fetchData={fetchQueue}
        refreshTrigger={refreshTrigger}
        renderItem={(submission) => (
          <SubmissionCard key={submission.id} submission={submission} />
        )}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        emptyActionLabel={languageFromUrl ? 'Clear Filter' : 'Submit Your Code'}
        onEmptyAction={
          languageFromUrl
            ? () => handleLanguageChange('')
            : () => navigate('/shadow/submissions/new')
        }
      />

      {/* Dropdown entrance animation keyframe */}
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
