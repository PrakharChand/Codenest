import React from 'react';
import Button from '../atoms/Button';

// ── SVG Preset Illustrations ───────────────────────────────────────────────

const FeedSVG = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const NotificationsSVG = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500/70">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    <polyline points="9 11 12 14 22 4" strokeWidth="2" />
  </svg>
);

const ShadowSVG = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-500/70">
    <rect x="2" y="4" width="20" height="16" rx="3" />
    <path d="m10 10-2 2 2 2" />
    <path d="m14 10 2 2-2 2" />
    <line x1="12" y1="2" x2="12" y2="4" />
  </svg>
);

const PostsSVG = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CommunitiesSVG = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500/70">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const SearchSVG = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500/70">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const PRESET_ICONS = {
  feed: <FeedSVG />,
  notifications: <NotificationsSVG />,
  shadow: <ShadowSVG />,
  posts: <PostsSVG />,
  communities: <CommunitiesSVG />,
  search: <SearchSVG />,
};

export default function EmptyState({
  preset,
  title = 'No items found',
  description = 'There are no items to display at this time.',
  icon,
  actionLabel,
  onAction,
  className = '',
}) {
  const displayIcon = icon || (preset && PRESET_ICONS[preset]);

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center border border-dashed border-[var(--border-main)] rounded-2xl bg-[var(--bg-surface)]/40 ${className}`}
    >
      {displayIcon && <div className="mb-4 flex items-center justify-center">{displayIcon}</div>}
      <h3 className="text-lg font-bold text-main">{title}</h3>
      <p className="mt-1 text-xs sm:text-sm text-muted max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button onClick={onAction} variant="primary" size="sm">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
