// GET /api/services
// Возвращает список доступных услуг из services_view

import type { Service } from '~/types/service'

interface ServiceRow {
  id: string
  name: string
  description: string | null
  price_monthly: number
  speed_down: number | null
  speed_up: number | null
  is_active: boolean
  sort_order: number
}

export default defineEventHandler(async (event) => {
  const supabase = useSupabaseServer()

  // Получаем пользователя из сессии
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) {
    throw createError({ statusCode: 401, message: 'Требуется авторизация' })
  }

  // Получаем активные услуги из services_view
  const { data, error } = await supabase
    .from('services_view')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching services:', error)
    throw createError({ statusCode: 500, message: 'Ошибка загрузки услуг' })
  }

  // Маппинг в camelCase
  const services: Service[] = (data as ServiceRow[]).map(row => ({
    id: Number(row.id),
    name: row.name,
    slug: null,
    description: row.description,
    priceMonthly: row.price_monthly,
    priceConnection: null,
    icon: null,
    color: null,
    features: null,
    equipment: null,
    sortOrder: row.sort_order,
    isActive: row.is_active
  }))

  return { services }
})
