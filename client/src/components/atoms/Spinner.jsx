import React from 'react';

/**
 * Spinner — uses CSS custom property primary color so it adapts
 * to Feed (violet) vs Shadow (cyan) theme automatically
 */
export default function Spinner({ size = 'md', className = '' }) {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-[3px]',
  };

  return (
    <div
      className={`inline-block animate-spin rounded-full border-solid border-t-transparent ${sizeMap[size]} ${className}`}
      style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
      role="status"
      aria-label="loading"
    >
      <span className="sr-only">Loading…</span>
    </div>
  );
}
