import React, { useId } from 'react';

/**
 * TextArea — matches Input styling: rounded-xl, violet focus ring
 */
export default function TextArea({
  label,
  error,
  id,
  rows = 4,
  className = '',
  required = false,
  hint,
  ...props
}) {
  const generatedId = useId();
  const textareaId = id || generatedId;
  const errorId = `${textareaId}-error`;
  const hintId  = `${textareaId}-hint`;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-semibold text-[var(--text-main)]">
          {label}
          {required && <span className="ml-0.5 text-[var(--color-danger)]">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={[
          'w-full rounded-xl border bg-[var(--bg-surface)] px-3 py-2.5 text-sm',
          'text-[var(--text-main)] placeholder:text-[var(--text-subtle)]',
          'transition-all duration-150 resize-y min-h-[80px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 focus-visible:border-[var(--color-primary)]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--bg-surface-subtle)]',
          error
            ? 'border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]/30'
            : 'border-[var(--border-main)]',
          className,
        ].join(' ')}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs font-medium text-[var(--color-danger)]">
          {typeof error === 'string' ? error : error.message}
        </p>
      )}
      {!error && hint && (
        <p id={hintId} className="text-xs text-[var(--text-subtle)]">
          {hint}
        </p>
      )}
    </div>
  );
}
