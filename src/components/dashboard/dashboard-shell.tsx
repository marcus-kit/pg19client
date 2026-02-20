/**
 * Главная обёртка (shell) для всех страниц внутри дашборда.
 *
 * Содержит: фиксированный header с логотипом, навигацией
 * (Главная, Счета, Профиль, Поддержка), переключателем темы и кнопкой выхода.
 * На мобильных — нижняя навигационная панель.
 * Отслеживает скролл для blur-эффекта на header.
 *
 * Функция handleLogout отправляет POST /api/auth/logout, очищает оба стора
 * и редиректит на /login.
 */
'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useUserStore, getShortName } from '@/store/use-user-store'
import { useAccountStore } from '@/store/use-account-store'
import { useEffect, useState } from 'react'
import { LogoutIcon, MoonIcon, SunIcon } from '../icons/icons'

const navigation = [
  { name: 'Главная', href: '/dashboard', icon: 'home' },
  { name: 'Счета', href: '/invoices', icon: 'document' },
  { name: 'Профиль', href: '/profile', icon: 'user' },
  { name: 'Поддержка', href: '/support', icon: 'chat' },
]

function Icon({ name }: { name: string }) {
  const className = 'w-5 h-5 md:w-6 md:h-6'
  if (name === 'home')
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  if (name === 'document')
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  if (name === 'user')
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  if (name === 'chat')
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    )
  return null
}


export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const user = useUserStore((s) => s.user)
  const logoutStore = useUserStore((s) => s.logout)
  const account = useAccountStore((s) => s.account)
  const clearAccount = useAccountStore((s) => s.clear)
  const [scrolled, setScrolled] = useState(false)
  const [_showMoreMenu, setShowMoreMenu] = useState(false)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleLogout = async () => {
    setShowMoreMenu(false)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    logoutStore()
    clearAccount()
    router.push('/login')
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--bg-base)' }}>
      <header
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'header-blur shadow-lg' : 'header-transparent'}`}
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image src="/logo.png" alt="ПЖ19" width={32} height={32} className="h-8 w-auto" />
            </Link>

            <nav className="hidden md:flex md:items-center md:gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon name={item.icon} />
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex md:items-center md:gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="theme-toggle"
                title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>
              <div className="text-right">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {getShortName(user)}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Договор {account?.contractNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg)] hover:text-primary"
                title="Выйти"
              >
                <LogoutIcon />
              </button>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:text-primary"
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>
              <Link
                href="/profile"
                className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:text-primary"
              >
                <Icon name="user" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-6">{children}</div>
      </main>

      <div className="md:hidden">
        <nav
          className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t px-2 backdrop-blur-lg"
          style={{
            background: 'var(--header-blur-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setShowMoreMenu(false)}
              className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-colors ${
                isActive(item.href) ? 'text-primary' : 'text-[var(--text-muted)]'
              }`}
            >
              <Icon name={item.icon} />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-[var(--text-muted)] transition-colors"
          >
            <LogoutIcon />
            <span className="text-xs font-medium">Выйти</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
