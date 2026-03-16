import type { Invoice, InvoiceStatus } from '~/types/invoice'

export default defineEventHandler(async (event) => {
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) throw createError({ statusCode: 401, message: 'Требуется авторизация' })
  if (!sessionUser.accountId) return { invoices: [] as Invoice[] }

  const prisma = usePrisma()
  const account = await prisma.account.findFirst({
    where: { id: sessionUser.accountId, user_id: sessionUser.id },
    select: { contract_id: true }
  })
  if (!account?.contract_id) return { invoices: [] as Invoice[] }

  // Ленивая синхронизация billing из legacy (не чаще раза в 6 часов)
  const contract = await prisma.contract.findFirst({
    where: { id: account.contract_id },
    select: { contract_number: true }
  })
  if (contract?.contract_number) {
    await syncContractBillingIfNeeded(account.contract_id, contract.contract_number)
  }

  const query = getQuery(event)
  const statusFilter = query.status as InvoiceStatus | undefined
  const limit = Math.min(Number(query.limit) || 50, 100)

  // Получаем все charge-записи (ASC для хронологического расчёта оплаты)
  const charges = await prisma.invoiceLog.findMany({
    where: { contract_id: account.contract_id, operation_type: 'charge' },
    orderBy: { created_at: 'asc' }
  })

  // Получаем сумму всех платежей
  const paysResult = await prisma.pays.aggregate({
    where: { contract_id: account.contract_id },
    _sum: { amount: true }
  })
  let totalPaid = Number(paysResult._sum.amount ?? 0)

  // Маркируем charge-записи: идём хронологически, вычитая из totalPaid
  const invoices: Invoice[] = charges.map(row => {
    const totalRub = Number(row.total_amount ?? 0)
    let invoiceStatus: InvoiceStatus = 'pending'

    if (totalPaid >= totalRub) {
      invoiceStatus = 'paid'
      totalPaid -= totalRub
    }

    // Период (начало/конец месяца) из created_at
    let periodStart: string | null = null
    let periodEnd: string | null = null
    if (row.created_at) {
      const d = new Date(row.created_at)
      periodStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
      periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
    }

    return {
      id: row.id,
      invoiceNumber: row.id.slice(0, 8),
      accountId: sessionUser.accountId!,
      contractId: row.contract_id ?? '',
      status: invoiceStatus,
      amount: Math.round(totalRub * 100),
      description: row.operation_type ?? '',
      periodStart,
      periodEnd,
      issuedAt: row.created_at?.toISOString() ?? '',
      dueDate: null,
      paidAt: invoiceStatus === 'paid' ? (row.created_at?.toISOString() ?? null) : null,
      createdAt: row.created_at?.toISOString() ?? '',
      updatedAt: row.created_at?.toISOString() ?? ''
    }
  })

  // Фильтр по статусу (после вычисления)
  let result = statusFilter ? invoices.filter(i => i.status === statusFilter) : invoices

  // Новые сверху + лимит
  result = result.reverse().slice(0, limit)

  return { invoices: result }
})
