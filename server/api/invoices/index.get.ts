// GET /api/invoices
// Возвращает счета пользователя из billing.invoices

import type { Invoice, InvoiceStatus } from '~/types/invoice'

interface InvoiceRow {
  id: string
  invoice_number: string
  account_id: string
  contract_id: string | null
  status: InvoiceStatus
  amount: number
  description: string | null
  period_start: string | null
  period_end: string | null
  issued_at: string | null
  due_date: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export default defineEventHandler(async (event) => {
  const supabase = useSupabaseServer()

  // Получаем пользователя из сессии
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) {
    throw createError({ statusCode: 401, message: 'Требуется авторизация' })
  }

  // Query параметры
  const query = getQuery(event)
  const status = query.status as InvoiceStatus | undefined
  const limit = Number(query.limit) || 50

  // Запрос счетов из billing.invoices
  let dbQuery = supabase
    .schema('billing')
    .from('invoices')
    .select('*')
    .eq('account_id', sessionUser.accountId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) {
    dbQuery = dbQuery.eq('status', status)
  }

  const { data, error } = await dbQuery

  if (error) {
    console.error('Error fetching invoices:', error)
    throw createError({ statusCode: 500, message: 'Ошибка загрузки счетов' })
  }

  // Маппинг в camelCase
  const invoices: Invoice[] = (data as InvoiceRow[]).map(row => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    accountId: row.account_id,
    contractId: row.contract_id,
    status: row.status,
    amount: row.amount,
    description: row.description,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    issuedAt: row.issued_at,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))

  return { invoices }
})
