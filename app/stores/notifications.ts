import { defineStore } from 'pinia'
import type { NotificationSettings } from '~/types'
import { defaultNotificationSettings } from '~/types'

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
  }
})
