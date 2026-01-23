/**
 * useReferralApi — API для реферальной программы
 *
 * Методы:
 * - load — загрузить данные программы
 */
import type { ReferralProgram } from '~/types'

export function useReferralApi() {
  async function load(userId: string): Promise<ReferralProgram | null> {
    try {
      return await $fetch<ReferralProgram>('/api/user/referral', {
        query: { userId }
      })
    } catch (error) {
      console.error('Failed to load referral program:', error)
      return null
    }
  }

  return { load }
}
