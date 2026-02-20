/**
 * Хранилище данных лицевого счёта (Zustand + persist).
 * Сохраняется в localStorage (ключ "pg19_account").
 * Хранит: номер договора, баланс, статус, тариф, адрес.
 * Вспомогательные функции: balanceRubles — баланс в рублях,
 * isBlocked — заблокирован ли аккаунт.
 * Заполняется при входе, очищается при выходе.
 */
'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Account } from '@/types'

const STORAGE_KEY = 'pg19_account'

interface AccountState {
  account: Account | null
  setAccount: (account: Account) => void
  clear: () => void
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      account: null,
      setAccount: (account) => set({ account }),
      clear: () => set({ account: null }),
    }),
    { name: STORAGE_KEY }
  )
)

export const balanceRubles = (account: Account | null): number =>
  (account?.balance ?? 0) / 100
export const isBlocked = (account: Account | null): boolean =>
  account?.status === 'blocked'
