import type { Ticket, TicketStatus, TicketCategory, TicketPriority } from '~/types/ticket'

export default defineEventHandler(async (event) => {
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) throw createError({ statusCode: 401, message: 'Требуется авторизация' })

  const query = getQuery(event)
  const status = query.status as TicketStatus | undefined

  const prisma = usePrisma()
  const where: { user_id: string; status?: TicketStatus } = { user_id: sessionUser.id }
  if (status) where.status = status

  const data = await prisma.ticket.findMany({
    where,
    orderBy: { created_at: 'desc' }
  })

  const ticketIds = data.map(t => t.id)
  let commentsCounts: Record<string, number> = {}
  if (ticketIds.length > 0) {
    const comments = await prisma.ticketComment.groupBy({
      by: ['ticket_id'],
      where: { ticket_id: { in: ticketIds }, is_internal: false },
      _count: { ticket_id: true }
    })
    for (const c of comments) {
      commentsCounts[c.ticket_id] = c._count.ticket_id
    }
  }

  const tickets: Ticket[] = data.map(row => ({
    id: String(row.id),
    number: row.number ?? '',
    userId: String(row.user_id ?? ''),
    userName: row.user_name ?? null,
    userEmail: row.user_email ?? null,
    userPhone: row.user_phone ?? null,
    subject: row.subject ?? '',
    description: row.description ?? '',
    category: (row.category ?? 'other') as TicketCategory,
    status: (row.status ?? 'new') as TicketStatus,
    priority: (row.priority ?? 'normal') as TicketPriority,
    firstResponseAt: row.first_response_at?.toISOString() ?? null,
    resolvedAt: row.resolved_at?.toISOString() ?? null,
    closedAt: row.closed_at?.toISOString() ?? null,
    createdAt: row.created_at?.toISOString() ?? '',
    updatedAt: row.updated_at?.toISOString() ?? '',
    commentsCount: commentsCounts[row.id] ?? 0
  }))
  return { tickets }
})
