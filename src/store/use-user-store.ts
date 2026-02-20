/**
 * Хранилище авторизации пользователя (Zustand + persist).
 *
 * Для чего этот файл:
 *   Хранит данные о текущем пользователе и флаг isAuthenticated.
 *   Использует middleware `persist`, который автоматически сохраняет
 *   состояние в localStorage (ключ "pg19_user") и восстанавливает его
 *   при следующем открытии страницы.
 *
 * Проблема гидратации:
 *   При первом рендере (SSR / клиентский маунт) persist ещё НЕ загрузил
 *   данные из localStorage — поэтому isAuthenticated = false.
 *   Через ~1 мс persist восстанавливает значения, но если AuthGuard
 *   уже сделал редирект на /login — пользователь теряет текущую страницу.
 *
 *   Решение: флаг _hasHydrated.
 *   - Начинается с false
 *   - Становится true в коллбэке onRehydrateStorage (когда persist
 *     закончил восстановление из localStorage)
 *   - AuthGuard и Redirect ждут _hasHydrated === true перед принятием
 *     решения о редиректе
 *
 * partialize:
 *   Указывает persist-у сохранять в localStorage ТОЛЬКО isAuthenticated
 *   и user. Служебное поле _hasHydrated не сохраняется — оно всегда
 *   начинается с false и выставляется в true после гидратации.
 */
'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

const STORAGE_KEY = 'pg19_user'

interface UserState {
  /** Авторизован ли пользователь */
  isAuthenticated: boolean
  /** Данные пользователя (ФИО, контракт и т.д.) */
  user: User | null
  /** Загружено ли состояние из localStorage (гидратация завершена) */
  _hasHydrated: boolean

  /** Установить пользователя после успешного входа */
  setUser: (user: User) => void
  /** Обновить отдельные поля пользователя */
  updateUser: (data: Partial<User>) => void
  /** Выйти из аккаунта — сбросить user и isAuthenticated */
  logout: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      _hasHydrated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),

      updateUser: (data) =>
        set((state) =>
          state.user ? { user: { ...state.user, ...data } } : state
        ),

      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: STORAGE_KEY,

      // Коллбэк вызывается ПОСЛЕ того, как persist восстановил данные
      // из localStorage. Здесь мы ставим _hasHydrated = true.
      onRehydrateStorage: () => () => {
        useUserStore.setState({ _hasHydrated: true })
      },

      // Сохраняем в localStorage только данные пользователя,
      // а _hasHydrated — это служебный рантайм-флаг
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
)

/**
 * Возвращает сокращённое ФИО: "Иванов И. П."
 */
export function getShortName(user: User | null): string {
  if (!user) return ''
  const firstInitial = user.firstName.charAt(0)
  const middleInitial = user.middleName ? user.middleName.charAt(0) + '.' : ''
  return `${user.lastName} ${firstInitial}. ${middleInitial}`.trim()
}
