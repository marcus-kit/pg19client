/**
 * Типы услуг и подписок
 *
 * Service, ServiceFeature, ServiceEquipment — каталог услуг
 * Subscription — подписка пользователя на услугу
 * subscriptionStatusLabels, subscriptionStatusColors — маппинги для UI
 *
 * Цены в копейках (priceMonthly, priceConnection, customPrice)
 */
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled'

export interface Service {
  id: string | number
  name: string
  slug: string | null
  description: string | null
  priceMonthly: number // в копейках
  priceConnection: number | null // в копейках
  icon: string | null
  color: string | null
  features: ServiceFeature[] | null
  equipment: ServiceEquipment[] | null
  sortOrder: number
  isActive: boolean
}

export interface ServiceFeature {
  icon: string
  title: string
  description: string
}

export interface ServiceEquipment {
  name: string
  description: string
  priceMonthly: number // в копейках
}

export interface Subscription {
  id: string | number
  accountId: string | number
  serviceId: string | number
  status: SubscriptionStatus
  startedAt: string
  expiresAt: string | null
  customPrice: number | null // в копейках
  isPrimary: boolean
  address?: string | null // object_address из contract_services
  createdAt: string
  updatedAt: string
  service?: Service
}

// Статусы для UI
export const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  active: 'Активна',
  paused: 'Приостановлена',
  cancelled: 'Отменена'
}

export const subscriptionStatusColors: Record<SubscriptionStatus, string> = {
  active: 'green',
  paused: 'yellow',
  cancelled: 'gray'
}
