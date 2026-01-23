/**
 * useReferralStore — реферальная программа
 *
 * State: referralProgram (промокод, статистика)
 * Actions: set, clear
 *
 * Не persist — загружается при каждом входе
 */
import { defineStore } from 'pinia'
import type { ReferralProgram } from '~/types'

interface ReferralState {
  referralProgram: ReferralProgram | null
}

export const useReferralStore = defineStore('referral', {
  state: (): ReferralState => ({
    referralProgram: null
  }),

  actions: {
    set(program: ReferralProgram | null) {
      this.referralProgram = program
    },

    clear() {
      this.referralProgram = null
    }
  }
})
