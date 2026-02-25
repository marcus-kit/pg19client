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

  const query = getQuery(event)
  const status = query.status as InvoiceStatus | undefined
  const limit = Math.min(Number(query.limit) || 50, 100)

  const where: { contract_id: string; operation_type?: string } = { contract_id: account.contract_id }
  if (status) where.operation_type = status

  const data = await prisma.invoiceLog.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: limit
  })

  const invoices: Invoice[] = data.map(row => ({
    id: row.id,
    invoiceNumber: row.id.slice(0, 8),
    accountId: sessionUser.accountId!,
    contractId: row.contract_id ?? '',
    status: mapOperationTypeToStatus(row.operation_type ?? ''),
    amount: Number(row.total_amount ?? 0),
    description: row.operation_type ?? '',
    periodStart: null,
    periodEnd: null,
    issuedAt: row.created_at?.toISOString() ?? '',
    dueDate: null,
    paidAt: row.operation_type === 'paid' ? (row.created_at?.toISOString() ?? null) : null,
    createdAt: row.created_at?.toISOString() ?? '',
    updatedAt: row.created_at?.toISOString() ?? ''
  }))
  return { invoices }
})

function mapOperationTypeToStatus(operationType: string): InvoiceStatus {
  const m: Record<string, InvoiceStatus> = { paid: 'paid', invoice: 'sent', payment: 'paid' }
  return m[operationType?.toLowerCase()] ?? 'pending'
}
