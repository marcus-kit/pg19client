import { defineStore } from 'pinia'

interface CommunityUnreadState {
  count: number
}

export const useCommunityUnreadStore = defineStore('communityUnread', {
  state: (): CommunityUnreadState => ({
    count: 0
  }),
  getters: {
    hasUnread: (state) => state.count > 0
  },
  actions: {
    increment(by: number = 1) {
      const next = this.count + (Number.isFinite(by) ? by : 1)
      this.count = Math.max(0, Math.floor(next))
    },
    clear() {
      this.count = 0
    }
  }
})

