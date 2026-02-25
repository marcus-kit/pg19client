// POST /api/support/tickets/:id/comment — добавить комментарий к тикету

import type { TicketComment } from '~/types/ticket'

interface AddCommentBody {
  content: string
}

export default defineEventHandler(async (event) => {
  const ticketId = getRouterParam(event, 'id')
  if (!ticketId) throw createError({ statusCode: 400, message: 'ID тикета обязателен' })

  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) throw createError({ statusCode: 401, message: 'Требуется авторизация' })

  const body = await readBody<AddCommentBody>(event)
  if (!body.content?.trim()) throw createError({ statusCode: 400, message: 'Комментарий не может быть пустым' })

  const prisma = usePrisma()
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, user_id: sessionUser.id },
    select: { id: true, status: true }
  })
  if (!ticket) throw createError({ statusCode: 404, message: 'Тикет не найден' })
  if (ticket.status === 'closed') {
    throw createError({ statusCode: 400, message: 'Нельзя добавить комментарий к закрытому тикету' })
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { first_name: true, last_name: true }
  })
  const authorName = user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || 'Пользователь' : 'Пользователь'

  const comment = await prisma.ticketComment.create({
    data: {
      ticket_id: ticketId,
      author_type: 'user',
      author_id: sessionUser.id,
      author_name: authorName,
      content: body.content.trim(),
      is_internal: false,
      is_solution: false
    }
  })

  if (ticket.status === 'pending') {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'open', updated_at: new Date() }
    })
  }

  const result: TicketComment = {
    id: String(comment.id),
    ticketId: String(comment.ticket_id),
    authorType: comment.author_type,
    authorId: comment.author_id ?? undefined,
    authorName: comment.author_name ?? undefined,
    content: comment.content,
    isInternal: comment.is_internal,
    isSolution: comment.is_solution,
    attachments: (comment.attachments as unknown as unknown[]) ?? [],
    createdAt: comment.created_at?.toISOString() ?? '',
    editedAt: comment.edited_at?.toISOString() ?? undefined
  }

  return { comment: result }
})
