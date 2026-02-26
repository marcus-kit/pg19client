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

  const data = await prisma.invoiceLog.findMany({
    where: { contract_id: account.contract_id, NOT: { operation_type: 'paid' } },
    orderBy: { created_at: 'desc' },
    select: { id: true, contract_id: true, operation_type: true, total_amount: true, created_at: true }
  })

  const invoices: Invoice[] = data.map(row => ({
    id: row.id,
    invoiceNumber: row.id.slice(0, 8),
    accountId: sessionUser.accountId!,
    contractId: row.contract_id ?? '',
    status: 'pending' as InvoiceStatus,
    amount: Math.round(Number(row.total_amount ?? 0) * 100),
    description: row.operation_type ?? '',
    periodStart: null,
    periodEnd: null,
    issuedAt: row.created_at?.toISOString() ?? '',
    dueDate: null,
    paidAt: null,
    createdAt: row.created_at?.toISOString() ?? '',
    updatedAt: row.created_at?.toISOString() ?? ''
  }))
  return { invoices }
})
