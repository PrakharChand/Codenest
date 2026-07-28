import React from 'react';

/**
 * Card — 3 elevation levels
 * flat     → border only, rounded-xl (default)
 * raised   → shadow-sm + border, rounded-xl
 * floating → shadow-lg + glass effect, rounded-2xl, no hard border
 */
export default function Card({
  children,
  className = '',
  elevation = 'flat', // 'flat' | 'raised' | 'floating'
  hoverable = false,
  onClick,
  ...props
}) {
  const elevations = {
    flat:
      'border border-[var(--border-main)] bg-[var(--bg-surface)] rounded-xl',
    raised:
      'border border-[var(--border-main)] bg-[var(--bg-surface)] rounded-xl shadow-[var(--shadow-sm)]',
    floating:
      'glass rounded-2xl shadow-[var(--shadow-lg)]',
  };

  const hoverStyles = hoverable
    ? 'cursor-pointer hover:shadow-[var(--shadow-md)] hover:border-[var(--color-primary)] hover:-translate-y-0.5 transition-all duration-150'
    : '';

  return (
    <div
      onClick={onClick}
      className={`text-[var(--text-main)] transition-all duration-150 ${elevations[elevation]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
