'use client'

import { type ReactNode } from 'react'

interface UiCardProps {
  children: ReactNode
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
  onClick?: (e?: React.MouseEvent) => void
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function UiCard({
  children,
  hover = false,
  padding = 'md',
  className = '',
  onClick,
}: UiCardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={(e) => onClick?.(e)}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`glass-card rounded-2xl ${paddingClasses[padding]} ${hover ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
