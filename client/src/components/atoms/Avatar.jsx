import React, { useState } from 'react';

/**
 * Avatar — user profile picture or initials fallback
 * Sizes: sm | md | lg | xl | 2xl
 * ring prop: adds a violet ring on hover (for interactive avatars)
 */
export default function Avatar({ src, name, size = 'md', className = '', ring = false }) {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    sm:  'w-8 h-8 text-xs',
    md:  'w-10 h-10 text-sm',
    lg:  'w-14 h-14 text-lg',
    xl:  'w-20 h-20 text-2xl',
    '2xl': 'w-28 h-28 text-4xl',
  };

  const getInitials = (str) => {
    if (!str) return '?';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return str.slice(0, 2).toUpperCase();
  };

  const ringStyle = ring
    ? 'ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--bg-surface)]'
    : 'ring-1 ring-[var(--border-main)]';

  return (
    <div
      className={[
        'relative inline-flex items-center justify-center overflow-hidden rounded-full',
        'bg-gradient-to-br from-[var(--color-primary-light)] to-[var(--bg-surface-hover)]',
        'font-semibold text-[var(--color-primary)] shrink-0',
        'transition-all duration-150',
        sizeMap[size] || sizeMap.md,
        ringStyle,
        className,
      ].join(' ')}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={name || 'User avatar'}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
