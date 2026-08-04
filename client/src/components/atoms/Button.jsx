import React from 'react';
import Spinner from './Spinner';

/**
 * Button — 3-tier visual hierarchy
 * primary   → filled violet gradient, white text, shadow + scale
 * secondary → white bg, violet border, violet text
 * ghost     → transparent, violet hover tint
 * danger    → red fill
 */
export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'danger'
  size = 'md',         // 'sm' | 'md' | 'lg'
  isLoading = false,
  disabled = false,
  className = '',
  type = 'button',
  icon,                // optional leading icon element
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl select-none ' +
    'transition-all duration-150 ease-out ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] focus-visible:ring-[var(--border-focus)] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none disabled:hover:scale-100';

  const variants = {
    primary:
      'bg-[var(--color-primary)] text-white ' +
      'hover:bg-[var(--color-primary-hover)] hover:scale-[1.02] hover:shadow-[var(--shadow-md)] ' +
      'active:scale-[0.98] shadow-[var(--shadow-sm)]',
    secondary:
      'bg-[var(--bg-surface)] text-[var(--color-primary)] ' +
      'border-2 border-[var(--color-primary)] ' +
      'hover:bg-[var(--color-primary-light)] hover:shadow-[var(--shadow-sm)] ' +
      'active:scale-[0.98]',
    ghost:
      'bg-transparent text-[var(--text-muted)] ' +
      'hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-main)] ' +
      'active:scale-[0.98]',
    danger:
      'bg-[var(--color-danger)] text-white ' +
      'hover:opacity-90 hover:scale-[1.02] hover:shadow-[var(--shadow-sm)] ' +
      'active:scale-[0.98] shadow-[var(--shadow-xs)]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner size="sm" />
          <span>{children || 'Loading…'}</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
