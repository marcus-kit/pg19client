/**
 * Провайдер тёмной/светлой темы.
 *
 * Обёртка над next-themes (ThemeProvider). Применяет тему через CSS-класс
 * на <html> (attribute="class"). По умолчанию — тёмная тема,
 * поддерживает системные настройки (enableSystem).
 */
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
