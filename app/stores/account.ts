/**
 * useAccountStore — лицевой счёт пользователя
 *
 * State: account
 * Getters: balanceRubles, isBlocked, daysRemaining
 * Actions: setAccount, clear
 *
 * Persist: localStorage (pg19_account)
 */
import { defineStore } from 'pinia'
import type { Account } from '~/types'

const STORAGE_KEY = 'pg19_account'

interface AccountState {
  account: Account | null
}

export const useAccountStore = defineStore('account', {
  state: (): AccountState => ({
    account: null
  }),

  getters: {
    balanceRubles: (state): number => (state.account?.balance || 0) / 100,
    isBlocked: (state): boolean => state.account?.status === 'blocked',
    daysRemaining: (state): number => {
      if (!state.account) return 0
      const avgDailyCost = 1700
      return Math.max(0, Math.floor((state.account.balance || 0) / avgDailyCost))
    }
  },

  actions: {
    setAccount(account: Account | null) {
      this.account = account
    },

    clear() {
      this.account = null
    }
  },

  persist: {
    key: STORAGE_KEY,
    pick: ['account']
  }
})
