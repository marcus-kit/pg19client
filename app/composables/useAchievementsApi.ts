/**
 * useAchievementsApi — API для достижений пользователя
 *
 * Методы:
 * - load — загрузить список достижений
 */
import type { Achievement } from '~/types'

export function useAchievementsApi() {
  async function load(userId: string): Promise<Achievement[]> {
    try {
      return await $fetch<Achievement[]>('/api/user/achievements', {
        query: { userId }
      })
    } catch (error) {
      console.error('Failed to load achievements:', error)
      return []
    }
  }

  return { load }
}
