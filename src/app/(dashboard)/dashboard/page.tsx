/**
 * Страница дашборда (/dashboard).
 *
 * Простая обёртка, которая рендерит компонент {@link DashboardView}.
 * DashboardView содержит карточку баланса, превью счетов и блок новостей.
 *
 * @module dashboard/page
 * @exports DashboardPage — React-компонент страницы дашборда
 */
import { DashboardView } from './dashboard-view'

export default function DashboardPage() {
  return <DashboardView />
}
