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

  // Получаем все charge-записи (ASC для хронологического расчёта оплаты)
  const charges = await prisma.invoiceLog.findMany({
    where: { contract_id: account.contract_id, operation_type: 'charge' },
    orderBy: { created_at: 'asc' },
    select: { id: true, contract_id: true, operation_type: true, total_amount: true, created_at: true }
  })

  // Получаем сумму всех платежей
  const paysResult = await prisma.pays.aggregate({
    where: { contract_id: account.contract_id },
    _sum: { amount: true }
  })
  let totalPaid = Number(paysResult._sum.amount ?? 0)

  // Маркируем и собираем только неоплаченные
  const invoices: Invoice[] = []
  for (const row of charges) {
    const totalRub = Number(row.total_amount ?? 0)

    if (totalPaid >= totalRub) {
      totalPaid -= totalRub
      continue // оплачен — пропускаем
    }

    let periodStart: string | null = null
    let periodEnd: string | null = null
    if (row.created_at) {
      const d = new Date(row.created_at)
      periodStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
      periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
    }

    invoices.push({
      id: row.id,
      invoiceNumber: row.id.slice(0, 8),
      accountId: sessionUser.accountId!,
      contractId: row.contract_id ?? '',
      status: 'pending' as InvoiceStatus,
      amount: Math.round(totalRub * 100),
      description: row.operation_type ?? '',
      periodStart,
      periodEnd,
      issuedAt: row.created_at?.toISOString() ?? '',
      dueDate: null,
      paidAt: null,
      createdAt: row.created_at?.toISOString() ?? '',
      updatedAt: row.created_at?.toISOString() ?? ''
    })
  }

  return { invoices: invoices.reverse() }
})
