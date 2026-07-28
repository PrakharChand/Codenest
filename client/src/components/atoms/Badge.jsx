import React from 'react';

/**
 * Badge — pill label with semantic variants
 * Variants: default | primary | success | warning | danger | outline
 * Sizes: sm | md
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) {
  const variants = {
    default: 'bg-[var(--bg-surface-hover)] text-[var(--text-muted)] border border-[var(--border-main)]',
    primary: 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium',
    success: 'bg-emerald-500/10 text-[var(--color-success)] font-medium',
    warning: 'bg-amber-500/10 text-[var(--color-warning)] font-medium',
    danger:  'bg-rose-500/10 text-[var(--color-danger)] font-medium',
    outline: 'bg-transparent border border-[var(--color-primary)] text-[var(--color-primary)] font-medium',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg font-sans leading-none ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}
