import React from 'react';

export default function Skeleton({ className = '', variant = 'text', height, width }) {
  const variantStyles = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  return (
    <div
      style={{ height, width }}
      className={`animate-pulse bg-surface-hover ${variantStyles[variant]} ${className}`}
      aria-hidden="true"
    />
  );
}
