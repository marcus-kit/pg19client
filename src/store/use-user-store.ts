'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

const STORAGE_KEY = 'pg19_user'

interface UserState {
  isAuthenticated: boolean
  user: User | null
  setUser: (user: User) => void
  updateUser: (data: Partial<User>) => void
  logout: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      setUser: (user) => set({ user, isAuthenticated: true }),
      updateUser: (data) =>
        set((state) =>
          state.user ? { user: { ...state.user, ...data } } : state
        ),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: STORAGE_KEY }
  )
)

export function getShortName(user: User | null): string {
  if (!user) return ''
  const firstInitial = user.firstName.charAt(0)
  const middleInitial = user.middleName ? user.middleName.charAt(0) + '.' : ''
  return `${user.lastName} ${firstInitial}. ${middleInitial}`.trim()
}
