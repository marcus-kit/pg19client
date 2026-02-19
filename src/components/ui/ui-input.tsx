'use client'

import { type InputHTMLAttributes, forwardRef } from 'react'

interface UiInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const UiInput = forwardRef<HTMLInputElement, UiInputProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label ? (
          <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          className={`w-full rounded-xl border px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 ${className}`}
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
          {...props}
        />
      </div>
    )
  }
)
UiInput.displayName = 'UiInput'
