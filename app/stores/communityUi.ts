import { defineStore } from 'pinia'

interface CommunityUiState {
  unreadCount: number
}

export const useCommunityUiStore = defineStore('communityUi', {
  state: (): CommunityUiState => ({
    unreadCount: 0
  }),
  getters: {
    hasUnread: (s) => s.unreadCount > 0
  },
  actions: {
    increment(by: number = 1) {
      const add = Number.isFinite(by) ? by : 1
      this.unreadCount = Math.max(0, Math.floor(this.unreadCount + add))
    },
    clear() {
      this.unreadCount = 0
    }
  }
})

