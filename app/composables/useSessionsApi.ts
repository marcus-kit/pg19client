/**
 * useSessionsApi — API для управления сессиями входа
 *
 * Методы:
 * - load — загрузить список сессий
 * - terminate — завершить сессию
 */
import type { LoginSession } from '~/types'

export function useSessionsApi() {
  async function load(userId: string): Promise<LoginSession[]> {
    try {
      return await $fetch<LoginSession[]>('/api/user/sessions', {
        query: { userId }
      })
    } catch (error) {
      console.error('Failed to load sessions:', error)
      return []
    }
  }

  async function terminate(sessionId: string): Promise<{ ok: boolean; currentSessionTerminated?: boolean }> {
    try {
      const res = await $fetch<{ success: boolean; currentSessionTerminated?: boolean }>(
        `/api/user/sessions/${sessionId}`,
        { method: 'DELETE' }
      )
      return { ok: true, currentSessionTerminated: res.currentSessionTerminated }
    } catch (error) {
      console.error('Failed to terminate session:', error)
      return { ok: false }
    }
  }

  return { load, terminate }
}
