/**
 * Компонент-обёртка для защиты приватных маршрутов.
 *
 * Для чего нужен:
 *   Оборачивает все страницы внутри (dashboard) layout.
 *   Если пользователь не авторизован — показывает заглушку и
 *   перенаправляет на /login. Если авторизован — рендерит children.
 *
 * Как работает:
 *   1. Читает _hasHydrated из хранилища.
 *      Пока persist не загрузил данные из localStorage,
 *      _hasHydrated === false. В этот момент мы НЕ принимаем
 *      решение о редиректе — просто показываем "Проверка авторизации...".
 *
 *   2. Когда _hasHydrated стал true — данные из localStorage уже
 *      восстановлены, и isAuthenticated содержит реальное значение.
 *
 *   3. Если isAuthenticated === false после гидратации — редирект
 *      на /login. Если true — рендерим содержимое страницы.
 *
 * Без проверки _hasHydrated:
 *   При каждом обновлении страницы (F5) или прямом переходе
 *   по URL (например /invoices/...) приложение мгновенно
 *   редиректило на /login, потому что isAuthenticated при первом
 *   рендере всегда false (persist ещё не успел загрузить данные).
 */
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/use-user-store'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isAuthenticated = useUserStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
        <p className="text-[var(--text-muted)]">Проверка авторизации...</p>
      </div>
    )
  }

  return <>{children}</>
}
