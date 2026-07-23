import React, { useId } from 'react';

export default function Input({
  label,
  error,
  id,
  type = 'text',
  className = '',
  required = false,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-main">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-md border border-main bg-surface px-3 py-2 text-sm text-main placeholder:text-subtle transition-colors focus-visible:border-focus focus-visible:ring-1 focus-visible:ring-border-focus ${
          error ? 'border-danger focus-visible:border-danger' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs text-danger font-medium">
          {typeof error === 'string' ? error : error.message}
        </p>
      )}
    </div>
  );
}
