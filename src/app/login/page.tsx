/**
 * @file Страница авторизации (/login).
 *
 * Предоставляет три способа входа: Telegram, по договору и по телефонному звонку.
 * На данный момент реализован только вход по договору.
 *
 * Как это работает:
 * 1. Пользователь вводит номер договора, фамилию и имя.
 * 2. Данные отправляются POST-запросом на /api/auth/contract.
 * 3. При успешной авторизации информация о пользователе и аккаунте
 *    сохраняется в Zustand-сторы (useUserStore, useAccountStore),
 *    после чего происходит редирект на /dashboard.
 *
 * Для тестирования предусмотрена кнопка «обход авторизации»,
 * которая создаёт моковые данные пользователя и пропускает вход.
 *
 * Если пользователь уже аутентифицирован, страница автоматически
 * перенаправляет его на /dashboard.
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { UiCard } from '@/components/ui/ui-card'
import { UiButton } from '@/components/ui/ui-button'
import { UiInput } from '@/components/ui/ui-input'
import { useUserStore } from '@/store/use-user-store'
import { useAccountStore } from '@/store/use-account-store'
import type { User, Account } from '@/types'

export default function LoginPage() {
  const router = useRouter()
  const isAuthenticated = useUserStore((s) => s.isAuthenticated)
  const setUser = useUserStore((s) => s.setUser)
  const setAccount = useAccountStore((s) => s.setAccount)
  const [method, setMethod] = useState<'telegram' | 'contract' | 'call'>('contract')
  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard')
  }, [isAuthenticated, router])
  const [form, setForm] = useState({
    contractNumber: '',
    lastName: '',
    firstName: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const bypassAuth = () => {
    setError('')
    const mockUser: User = {
      id: 'bypass-user-id',
      firstName: 'Тестовый',
      lastName: 'Пользователь',
      middleName: 'Временный',
      phone: '+79001234567',
      email: 'test@example.com',
      telegram: '',
      telegramId: null,
      vkId: '',
      avatar: null,
      birthDate: null,
      role: 'user',
    }
    const mockAccount: Account = {
      contractNumber: 12345,
      balance: 0,
      status: 'active',
      tariff: 'ИНТЕРНЕТ ПЖ19',
      address: 'обл Ростовская, г Таганрог, пер Комсомольский, д. 27',
      startDate: new Date().toISOString(),
    }
    setUser(mockUser)
    setAccount(mockAccount)
    router.push('/dashboard')
  }

  async function handleContractSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.contractNumber.trim() && !form.lastName.trim() && !form.firstName.trim()) {
      bypassAuth()
      return
    }

    if (!form.contractNumber.trim() || !form.lastName.trim() || !form.firstName.trim()) {
      setError('Заполните все поля')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractNumber: form.contractNumber.trim(),
          lastName: form.lastName.trim(),
          firstName: form.firstName.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Ошибка авторизации')
      setUser(data.user as User)
      setAccount(data.account as Account)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка авторизации')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mesh-gradient-hero flex min-h-screen flex-col">
      <header className="py-6">
        <div className="container mx-auto px-4">
          <Link href="/dashboard" className="flex w-fit items-center gap-3">
            <Image src="/logo.png" alt="ПЖ19" width={40} height={40} className="h-10 w-auto" />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <UiCard padding="lg">
            <div className="mb-6 text-center">
              <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
                Вход в личный кабинет
              </h1>
              <p className="text-[var(--text-muted)]">Выберите способ входа</p>
            </div>

            <div
              className="mb-6 flex rounded-lg p-1"
              style={{ background: 'var(--glass-bg)' }}
            >
              <button
                type="button"
                onClick={() => setMethod('telegram')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-all ${
                  method === 'telegram'
                    ? 'bg-[#0088cc] text-white shadow-md'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Telegram
              </button>
              <button
                type="button"
                onClick={() => setMethod('contract')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-all ${
                  method === 'contract'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Договор
              </button>
              <button
                type="button"
                onClick={() => setMethod('call')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-all ${
                  method === 'call'
                    ? 'bg-accent text-white shadow-md'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Звонок
              </button>
            </div>

            {method === 'contract' && (
              <form onSubmit={handleContractSubmit} className="space-y-5">
                <UiInput
                  label="Номер договора"
                  placeholder="12345"
                  inputMode="numeric"
                  value={form.contractNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contractNumber: e.target.value }))
                  }
                />
                <UiInput
                  label="Логин"
                  placeholder="Логин"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                />
                <UiInput
                  label="Имя"
                  placeholder="Имя"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                />
                <UiButton type="submit" block loading={isLoading}>
                  Войти
                </UiButton>
              </form>
            )}

            {method === 'telegram' && (
              <p className="text-center text-sm text-[var(--text-muted)]">
                Авторизация через Telegram будет доступна в следующей версии.
                Используйте вход по договору.
              </p>
            )}

            {method === 'call' && (
              <p className="text-center text-sm text-[var(--text-muted)]">
                Верификация по звонку будет доступна в следующей версии.
                Используйте вход по договору.
              </p>
            )}

            {error && (
              <p className="mt-4 text-center text-sm text-red-400">{error}</p>
            )}

            <div
              className="mt-6 space-y-3 border-t pt-6"
              style={{ borderColor: 'var(--glass-border)' }}
            >
              {method === 'contract' && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={bypassAuth}
                    className="text-sm text-[var(--text-muted)] transition-colors hover:text-primary"
                  >
                    Обход авторизации (тестовый вход)
                  </button>
                </div>
              )}
              <div className="text-center">
                <a
                  href="https://pg19.doka.team"
                  className="text-sm text-[var(--text-muted)] transition-colors hover:text-primary"
                >
                  Вернуться на главную
                </a>
              </div>
            </div>
          </UiCard>
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} ПЖ19. Все права защищены.</p>
      </footer>
    </div>
  )
}
