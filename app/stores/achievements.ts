import { defineStore } from 'pinia'
import type { Achievement } from '~/types'

interface AchievementsState {
  achievements: Achievement[]
}

export const useAchievementsStore = defineStore('achievements', {
  state: (): AchievementsState => ({
    achievements: []
  }),

  actions: {
    set(achievements: Achievement[]) {
      this.achievements = achievements
    },

    clear() {
      this.achievements = []
    }
  }
})
