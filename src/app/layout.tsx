/**
 * Корневой layout, оборачивающий все страницы приложения.
 *
 * Устанавливает язык документа (`<html lang="ru">`), подключает глобальные
 * стили (globals.css) и оборачивает содержимое в {@link ThemeProvider} для
 * поддержки тёмной/светлой темы. Также определяет метаданные страницы
 * (title, description) через объект {@link Metadata} из Next.js.
 *
 * @module layout
 * @exports RootLayout — React-компонент корневого layout
 */
import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'ПЖ19 — Личный кабинет',
  description:
    'Личный кабинет абонента ПЖ19. Баланс, счета, услуги, поддержка.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
