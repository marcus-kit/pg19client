/**
 * useNotificationsStore — настройки уведомлений
 *
 * State: notifications (каналы и типы)
 * Actions: set, update, reset
 *
 * Persist: localStorage (pg19_notifications)
 */
import { defineStore } from 'pinia'
import type { NotificationSettings } from '~/types'
import { defaultNotificationSettings } from '~/types'

const STORAGE_KEY = 'pg19_notifications'

interface NotificationsState {
  notifications: NotificationSettings
}

export const useNotificationsStore = defineStore('notifications', {
  state: (): NotificationsState => ({
    notifications: { ...defaultNotificationSettings }
  }),

  actions: {
    set(notifications: NotificationSettings) {
      this.notifications = notifications
    },

    update(settings: Partial<NotificationSettings>) {
      if (settings.types) {
        this.notifications = {
          ...this.notifications,
          ...settings,
          types: { ...this.notifications.types, ...settings.types }
        }
      } else {
        this.notifications = { ...this.notifications, ...settings }
      }
    },

    reset() {
      this.notifications = { ...defaultNotificationSettings }
    }
  },

  persist: {
    key: STORAGE_KEY,
    pick: ['notifications']
  }
})
