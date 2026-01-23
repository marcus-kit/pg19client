/**
 * useSessionsStore — активные сессии входа
 *
 * State: sessions (список активных сессий)
 * Actions: set, remove, clear
 *
 * Не persist — загружается при каждом входе
 */
import { defineStore } from 'pinia'
import type { LoginSession } from '~/types'

interface SessionsState {
  sessions: LoginSession[]
}

export const useSessionsStore = defineStore('sessions', {
  state: (): SessionsState => ({
    sessions: []
  }),

  actions: {
    set(sessions: LoginSession[]) {
      this.sessions = sessions
    },

    remove(sessionId: string) {
      this.sessions = this.sessions.filter(s => s.id !== sessionId)
    },

    clear() {
      this.sessions = []
    }
  }
})
