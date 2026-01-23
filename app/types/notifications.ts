/**
 * Типы настроек уведомлений
 *
 * NotificationTypes — категории: payments, maintenance, promotions, news
 * NotificationSettings — каналы (email, sms, push, telegram) + категории
 * defaultNotificationSettings — значения по умолчанию
 */
export interface NotificationTypes {
  payments: boolean
  maintenance: boolean
  promotions: boolean
  news: boolean
}

export interface NotificationSettings {
  email: boolean
  sms: boolean
  push: boolean
  telegram: boolean
  types: NotificationTypes
}

export const defaultNotificationSettings: NotificationSettings = {
  email: false,
  sms: false,
  push: false,
  telegram: false,
  types: {
    payments: true,
    maintenance: true,
    promotions: false,
    news: false
  }
}
