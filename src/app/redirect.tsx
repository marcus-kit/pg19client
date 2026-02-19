'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/use-user-store'

export function Redirect() {
  const router = useRouter()
  const isAuthenticated = useUserStore((s) => s.isAuthenticated)

  useEffect(() => {
    router.replace(isAuthenticated ? '/dashboard' : '/login')
  }, [isAuthenticated, router])

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
      <p className="text-[var(--text-muted)]">Загрузка...</p>
    </div>
  )
}
