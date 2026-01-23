/**
 * useUserApi — API для обновления данных пользователя
 *
 * Методы:
 * - update — обновить профиль пользователя
 */
import type { User } from '~/types'

export function useUserApi() {
  async function update(userId: string, data: Partial<User>): Promise<User | null> {
    try {
      const response = await $fetch<{ success: boolean; user: User }>('/api/user/update', {
        method: 'POST',
        body: { userId, data }
      })
      return response.success ? response.user : null
    } catch (error) {
      console.error('Failed to update user:', error)
      return null
    }
  }

  return { update }
}
