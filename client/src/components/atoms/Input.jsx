import React, { useId } from 'react';

/**
 * Input — Premium input with violet focus ring, icon slot, rounded-xl
 */
export default function Input({
  label,
  error,
  id,
  type = 'text',
  className = '',
  required = false,
  icon,         // optional leading icon element
  hint,         // optional helper text shown below input
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const hintId  = `${inputId}-hint`;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-[var(--text-main)]">
          {label}
          {required && <span className="ml-0.5 text-[var(--color-danger)]">*</span>}
        </label>
      )}

      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          type={type}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={[
            'w-full rounded-xl border bg-[var(--bg-surface)] py-2.5 text-sm',
            'text-[var(--text-main)] placeholder:text-[var(--text-subtle)]',
            'transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 focus-visible:border-[var(--color-primary)]',
            icon ? 'pl-9 pr-3' : 'px-3',
            error
              ? 'border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]/30'
              : 'border-[var(--border-main)]',
            className,
          ].join(' ')}
          {...props}
        />
      </div>

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
