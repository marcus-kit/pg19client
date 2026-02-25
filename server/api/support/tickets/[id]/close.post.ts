// POST /api/support/tickets/:id/close — закрытие тикета (resolved/closed)

export default defineEventHandler(async (event) => {
  const ticketId = getRouterParam(event, 'id')
  if (!ticketId) throw createError({ statusCode: 400, message: 'ID тикета обязателен' })

  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) throw createError({ statusCode: 401, message: 'Требуется авторизация' })

  const body = await readBody(event)
  const status = body?.status
  if (!status || !['resolved', 'closed'].includes(status)) {
    throw createError({ statusCode: 400, message: 'Некорректный статус. Допустимые: resolved, closed' })
  }

  const prisma = usePrisma()
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId },
    select: { id: true, user_id: true, status: true }
  })
  if (!ticket) throw createError({ statusCode: 404, message: 'Тикет не найден' })
  if (ticket.user_id !== sessionUser.id) {
    throw createError({ statusCode: 403, message: 'Нет доступа к этому тикету' })
  }
  if (['resolved', 'closed'].includes(ticket.status)) {
    throw createError({ statusCode: 400, message: 'Тикет уже закрыт' })
  }

  const now = new Date()
  const updateData: { status: string; updated_at: Date; resolved_at?: Date; closed_at?: Date } = {
    status,
    updated_at: now
  }
  if (status === 'resolved') updateData.resolved_at = now
  else updateData.closed_at = now

  await prisma.ticket.update({
    where: { id: ticketId },
    data: updateData
  })

  const systemComment = status === 'resolved'
    ? 'Пользователь отметил заявку как решённую'
    : 'Пользователь закрыл заявку'

  await prisma.ticketComment.create({
    data: {
      ticket_id: ticketId,
      author_type: 'system',
      author_id: sessionUser.id,
      author_name: null,
      content: systemComment,
      is_internal: false,
      is_solution: false
    }
  }).catch(() => {
    // Тикет уже закрыт, комментарий не критичен
  })

  return { success: true, status }
})
