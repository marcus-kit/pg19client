// GET /api/contracts
// Возвращает контракты пользователя из contracts_view

import type { Account, AccountStatus } from '~/types/account'

interface ContractRow {
  id: string
  contract_number: string
  balance: number
  status: AccountStatus
  address: string
  tariff: string | null
  start_date: string | null
  user_id: string
  customer_name: string | null
  customer_phone: string | null
}

export default defineEventHandler(async (event) => {
  const supabase = useSupabaseServer()

  // Получаем пользователя из сессии
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) {
    throw createError({ statusCode: 401, message: 'Требуется авторизация' })
  }

  // Получаем контракты из contracts_view
  const { data, error } = await supabase
    .from('contracts_view')
    .select('*')
    .eq('user_id', sessionUser.id)
    .order('start_date', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Error fetching contracts:', error)
    throw createError({ statusCode: 500, message: 'Ошибка загрузки контрактов' })
  }

  // Маппинг в camelCase
  const contracts: Account[] = (data as ContractRow[]).map(row => ({
    contractNumber: Number(row.contract_number),
    balance: row.balance,
    status: row.status,
    tariff: row.tariff || 'Не указан',
    address: row.address,
    startDate: row.start_date || new Date().toISOString()
  }))

  return { contracts }
})
