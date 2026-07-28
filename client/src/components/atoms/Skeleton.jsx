import React from 'react';

/**
 * Skeleton — animated shimmer placeholder
 * Uses .skeleton-shimmer from index.css for the gradient animation
 */
export default function Skeleton({ className = '', width, height, rounded = 'rounded-xl' }) {
  return (
    <div
      className={`skeleton-shimmer ${rounded} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/**
 * SkeletonText — convenience wrapper for text line skeletons
 */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="14px"
          className="rounded-md"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonCard — full card placeholder
 */
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`border border-[var(--border-main)] rounded-xl p-5 space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton width="40px" height="40px" rounded="rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton height="14px" width="140px" />
          <Skeleton height="12px" width="90px" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <Skeleton height="12px" width="80px" />
    </div>
  );
}

