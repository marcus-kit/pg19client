/**
 * Компонент редиректа с корневой страницы (/).
 *
 * Для чего нужен:
 *   Корневой маршрут "/" не имеет собственного UI.
 *   Этот компонент решает, куда отправить пользователя:
 *   - Авторизован  → /dashboard
 *   - Не авторизован → /login
 *
 * Как работает:
 *   1. Ждёт _hasHydrated === true — это значит, что Zustand persist
 *      загрузил данные из localStorage и isAuthenticated содержит
 *      реальное значение (а не дефолтный false).
 *
 *   2. Только после гидратации выполняет router.replace().
 *      Без этой проверки пользователь при заходе на "/" всегда
 *      попадал бы на /login (потому что при первом рендере
 *      isAuthenticated = false, пока persist не загрузился).
 *
 *   3. Пока решение не принято — показывает "Загрузка...".


*/
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/use-user-store'

export function Redirect() {
  const router = useRouter()
  const isAuthenticated = useUserStore((s) => s.isAuthenticated)
  const hasHydrated = useUserStore((s) => s._hasHydrated)

  useEffect(() => {
    // Редирект только после загрузки состояния из localStorage
    if (hasHydrated) {
      router.replace(isAuthenticated ? '/dashboard' : '/login')
    }
  }, [hasHydrated, isAuthenticated, router])

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
      <p className="text-[var(--text-muted)]">Загрузка...</p>
    </div>
  )
}
