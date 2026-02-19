'use client'

import { type ButtonHTMLAttributes, type ReactNode } from 'react'

interface UiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  block?: boolean
  children: ReactNode
  className?: string
}

export function UiButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  disabled,
  children,
  className = '',
  ...props
}: UiButtonProps) {
  return (
    <button
      type="button"
      className={`u-btn u-btn--${variant} u-btn--${size} ${block ? 'u-btn--block' : ''} ${disabled || loading ? 'u-btn--disabled' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  )
}
