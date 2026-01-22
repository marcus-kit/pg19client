import { defineStore } from 'pinia'
import type { User } from '~/types'

interface UserState {
  isAuthenticated: boolean
  user: User | null
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    isAuthenticated: false,
    user: null
  }),

  getters: {
    fullName: (state): string => {
      if (!state.user) return ''
      return `${state.user.lastName} ${state.user.firstName} ${state.user.middleName}`.trim()
    },

    shortName: (state): string => {
      if (!state.user) return ''
      const firstInitial = state.user.firstName.charAt(0)
      const middleInitial = state.user.middleName ? state.user.middleName.charAt(0) + '.' : ''
      return `${state.user.lastName} ${firstInitial}. ${middleInitial}`.trim()
    },

    isAdmin: (state): boolean => state.user?.role === 'admin',
    isModerator: (state): boolean => state.user?.role === 'moderator',
    hasAdminAccess: (state): boolean => state.user?.role === 'admin' || state.user?.role === 'moderator'
  },

  actions: {
    setUser(user: User) {
      this.user = user
      this.isAuthenticated = true
    },

    updateUser(data: Partial<User>) {
      if (this.user) {
        this.user = { ...this.user, ...data }
      }
    },

    logout() {
      this.isAuthenticated = false
      this.user = null
    }
  }
})
