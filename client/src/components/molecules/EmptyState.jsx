import React from 'react';
import Button from '../atoms/Button';

export default function EmptyState({
  title = 'No items found',
  description = 'There are no items to display at this time.',
  icon,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center border border-dashed border-main rounded-xl bg-surface-subtle ${className}`}
    >
      {icon && <div className="mb-4 text-muted text-4xl">{icon}</div>}
      <h3 className="text-lg font-semibold text-main">{title}</h3>
      <p className="mt-1 text-sm text-muted max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button onClick={onAction} variant="primary" size="sm">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
