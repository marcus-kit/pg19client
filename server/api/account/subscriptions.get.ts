// GET /api/account/subscriptions
// Возвращает подписки (подключенные услуги) пользователя из subscriptions_view

import type { Subscription, SubscriptionStatus } from '~/types/service'

interface SubscriptionRow {
  id: string
  object_id: string
  service_id: string
  contract_id: string
  user_id: string
  status: SubscriptionStatus
  price: number
  started_at: string
  ended_at: string | null
  service_name: string
  speed_down: number | null
  speed_up: number | null
}

export default defineEventHandler(async (event) => {
  const supabase = useSupabaseServer()

  // Получаем пользователя из сессии
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) {
    throw createError({ statusCode: 401, message: 'Требуется авторизация' })
  }

  // Получаем подписки из subscriptions_view
  const { data, error } = await supabase
    .from('subscriptions_view')
    .select('*')
    .eq('user_id', sessionUser.id)
    .in('status', ['active', 'paused'])
    .order('started_at', { ascending: false })

  if (error) {
    console.error('Error fetching subscriptions:', error)
    throw createError({ statusCode: 500, message: 'Ошибка загрузки подписок' })
  }

  // Маппинг в camelCase
  const subscriptions: Subscription[] = (data as SubscriptionRow[]).map(row => ({
    id: Number(row.id),
    accountId: Number(row.user_id),
    serviceId: Number(row.service_id),
    status: row.status,
    startedAt: row.started_at,
    expiresAt: row.ended_at,
    customPrice: row.price,
    isPrimary: false,
    createdAt: row.started_at,
    updatedAt: row.started_at,
    service: {
      id: Number(row.service_id),
      name: row.service_name,
      slug: null,
      description: null,
      priceMonthly: row.price,
      priceConnection: null,
      icon: null,
      color: null,
      features: null,
      equipment: null,
      sortOrder: 0,
      isActive: true
    }
  }))

  return { subscriptions }
})
