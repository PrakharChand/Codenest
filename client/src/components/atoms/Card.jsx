import React from 'react';

export default function Card({ children, className = '', hoverable = false, onClick, ...props }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg border border-main bg-surface p-5 text-main transition-colors ${
        hoverable ? 'hover:bg-surface-hover hover:border-focus cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
