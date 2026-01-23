/**
 * useAchievementsStore — достижения пользователя
 *
 * State: achievements (список достижений)
 * Actions: set, clear
 *
 * Не persist — загружается при каждом входе
 */
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
