/**
 * Layout для всех страниц внутри route-группы (dashboard).
 *
 * Применяется к маршрутам /dashboard, /invoices, /profile, /support и др.
 * Оборачивает дочерние страницы в {@link AuthGuard} (перенаправляет на /login,
 * если пользователь не авторизован) и в {@link DashboardShell} (шапка +
 * навигация + подвал).
 *
 * @module (dashboard)/layout
 * @exports DashboardLayout — React-компонент layout панели управления
 */
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { AuthGuard } from '@/components/auth-guard'

export default function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  )
}
