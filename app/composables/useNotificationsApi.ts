import type { NotificationSettings } from '~/types'
import { defaultNotificationSettings } from '~/types'

export function useNotificationsApi() {
  async function load(): Promise<NotificationSettings> {
    try {
      const data = await $fetch<Record<string, boolean>>('/api/user/notifications')
      return {
        email: data.email ?? true,
        sms: data.sms ?? false,
        push: data.push ?? true,
        telegram: data.telegram ?? true,
        types: {
          payments: data.payments ?? true,
          maintenance: data.maintenance ?? true,
          promotions: data.promo ?? false,
          news: data.news ?? true
        }
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
      return { ...defaultNotificationSettings }
    }
  }

  async function update(settings: Partial<NotificationSettings>): Promise<boolean> {
    try {
      const apiSettings: Record<string, boolean> = {}
      if (settings.email !== undefined) apiSettings.email = settings.email
      if (settings.sms !== undefined) apiSettings.sms = settings.sms
      if (settings.push !== undefined) apiSettings.push = settings.push
      if (settings.telegram !== undefined) apiSettings.telegram = settings.telegram
      if (settings.types?.payments !== undefined) apiSettings.payments = settings.types.payments
      if (settings.types?.maintenance !== undefined) apiSettings.maintenance = settings.types.maintenance
      if (settings.types?.promotions !== undefined) apiSettings.promo = settings.types.promotions
      if (settings.types?.news !== undefined) apiSettings.news = settings.types.news

      await $fetch('/api/user/notifications', {
        method: 'PUT',
        body: { settings: apiSettings }
      })
      return true
    } catch (error) {
      console.error('Failed to update notifications:', error)
      return false
    }
  }

  return { load, update }
}
