import type { Ticket, TicketCategory } from '~/types/ticket'
import { randomUUID } from 'crypto'

interface CreateTicketBody {
  subject: string
  description: string
  category: TicketCategory
}

export default defineEventHandler(async (event) => {
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) throw createError({ statusCode: 401, message: 'Требуется авторизация' })

  const body = await readBody<CreateTicketBody>(event)
  if (!body.subject?.trim()) throw createError({ statusCode: 400, message: 'Тема обращения обязательна' })
  if (!body.description?.trim()) throw createError({ statusCode: 400, message: 'Описание проблемы обязательно' })

  const prisma = usePrisma()
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { first_name: true, last_name: true, email: true, phone: true, telegram_id: true }
  })
  const userName = user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || null : null

  const now = new Date()
  const data = await prisma.ticket.create({
    data: {
      id: randomUUID(),
      user_id: sessionUser.id,
      user_name: userName,
      user_email: user?.email ?? null,
      user_phone: user?.phone ?? null,
      user_telegram_id: user?.telegram_id ? BigInt(parseInt(user.telegram_id, 10)) : null,
      subject: body.subject.trim(),
      description: body.description.trim(),
      category: body.category ?? 'other',
      status: 'new',
      priority: 'normal',
      number: `T-${Date.now()}`,
      created_at: now,
      updated_at: now
    }
  })

  const ticket: Ticket = {
    id: String(data.id),
    number: data.number ?? '',
    userId: String(data.user_id ?? ''),
    userName: data.user_name ?? null,
    userEmail: data.user_email ?? null,
    userPhone: data.user_phone ?? null,
    subject: data.subject ?? '',
    description: data.description ?? '',
    category: (data.category ?? 'other') as TicketCategory,
    status: (data.status ?? 'new') as Ticket['status'],
    priority: (data.priority ?? 'normal') as Ticket['priority'],
    firstResponseAt: data.first_response_at?.toISOString() ?? null,
    resolvedAt: data.resolved_at?.toISOString() ?? null,
    closedAt: data.closed_at?.toISOString() ?? null,
    createdAt: data.created_at?.toISOString() ?? '',
    updatedAt: data.updated_at?.toISOString() ?? '',
    commentsCount: 0
  }
  return { ticket }
})
