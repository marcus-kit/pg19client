// GET /api/support/tickets/:id — тикет с комментариями

import type { TicketDetail, TicketComment } from '~/types/ticket'

export default defineEventHandler(async (event) => {
  const ticketId = getRouterParam(event, 'id')
  if (!ticketId) throw createError({ statusCode: 400, message: 'ID тикета обязателен' })

  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) throw createError({ statusCode: 401, message: 'Требуется авторизация' })

  const prisma = usePrisma()
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, user_id: sessionUser.id }
  })
  if (!ticket) throw createError({ statusCode: 404, message: 'Тикет не найден' })

  const comments = await prisma.ticketComment.findMany({
    where: { ticket_id: ticketId, is_internal: false },
    orderBy: { created_at: 'asc' }
  })

  const mappedComments: TicketComment[] = comments.map(c => ({
    id: String(c.id),
    ticketId: String(c.ticket_id),
    authorType: c.author_type,
    authorId: c.author_id ?? undefined,
    authorName: c.author_name ?? undefined,
    content: c.content,
    isInternal: c.is_internal,
    isSolution: c.is_solution,
    attachments: (c.attachments as unknown as unknown[]) ?? [],
    createdAt: c.created_at?.toISOString() ?? '',
    editedAt: c.edited_at?.toISOString() ?? undefined
  }))

  const result: TicketDetail = {
    id: String(ticket.id),
    number: ticket.number ?? '',
    userId: String(ticket.user_id),
    userName: ticket.user_name ?? null,
    userEmail: ticket.user_email ?? null,
    userPhone: ticket.user_phone ?? null,
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    status: ticket.status,
    priority: ticket.priority,
    firstResponseAt: ticket.first_response_at?.toISOString() ?? null,
    resolvedAt: ticket.resolved_at?.toISOString() ?? null,
    closedAt: ticket.closed_at?.toISOString() ?? null,
    createdAt: ticket.created_at?.toISOString() ?? '',
    updatedAt: ticket.updated_at?.toISOString() ?? '',
    comments: mappedComments
  }

  return { ticket: result }
})
