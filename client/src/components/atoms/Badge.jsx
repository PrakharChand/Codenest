import React from 'react';

export default function Badge({
  children,
  variant = 'default', // 'default' | 'primary' | 'success' | 'warning' | 'danger'
  size = 'md',
  className = '',
}) {
  const variantStyles = {
    default: 'bg-surface-hover text-muted border border-main',
    primary: 'bg-primary-light text-primary font-medium',
    success: 'bg-emerald-500/10 text-success font-medium',
    warning: 'bg-amber-500/10 text-warning font-medium',
    danger: 'bg-rose-500/10 text-danger font-medium',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-sans leading-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
}
