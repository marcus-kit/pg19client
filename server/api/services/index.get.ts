// GET /api/services
// Возвращает список доступных услуг

import type { Service } from '~/types/service'

interface ServiceRow {
  id: number
  name: string
  slug: string | null
  description: string | null
  price_monthly: number
  price_connection: number | null
  icon: string | null
  color: string | null
  features: any | null
  equipment: any | null
  sort_order: number
  is_active: boolean
}

export default defineEventHandler(async (event) => {
  const supabase = useSupabaseServer()

  // Получаем пользователя из сессии
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) {
    throw createError({ statusCode: 401, message: 'Требуется авторизация' })
  }

  // Получаем активные услуги
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching services:', error)
    throw createError({ statusCode: 500, message: 'Ошибка загрузки услуг' })
  }

  // Маппинг в camelCase
  const services: Service[] = (data as ServiceRow[]).map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    priceMonthly: row.price_monthly,
    priceConnection: row.price_connection,
    icon: row.icon,
    color: row.color,
    features: row.features,
    equipment: row.equipment,
    sortOrder: row.sort_order,
    isActive: row.is_active
  }))

  return { services }
})
