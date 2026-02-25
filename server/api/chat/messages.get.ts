import { getCookie } from 'h3'
import type { ChatMessage } from '~/types/chat'

const CHAT_SESSION_COOKIE = 'pg19_chat_session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const chatId = query.chatId as string
  if (!chatId) {
    throw createError({
      statusCode: 400,
      message: 'chatId обязателен'
    })
  }

  const limit = Math.min(parseInt(query.limit as string) || 50, 100)
  const offset = parseInt(query.offset as string) || 0

  const prisma = usePrisma()

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { id: true, user_id: true, session_token: true, status: true }
  })

  if (!chat) {
    throw createError({
      statusCode: 404,
      message: 'Чат не найден'
    })
  }

  const sessionUser = await getUserFromSession(event)
  const chatSessionToken = getCookie(event, CHAT_SESSION_COOKIE)

  if (chat.user_id) {
    if (!sessionUser || sessionUser.id !== chat.user_id) {
      throw createError({
        statusCode: 403,
        message: 'Нет доступа к этому чату'
      })
    }
  } else {
    if (!chatSessionToken || chatSessionToken !== chat.session_token) {
      throw createError({
        statusCode: 403,
        message: 'Нет доступа к этому чату'
      })
    }
  }

  const [messages, total] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { chat_id: chatId },
      orderBy: { created_at: 'asc' },
      skip: offset,
      take: limit
    }),
    prisma.chatMessage.count({ where: { chat_id: chatId } })
  ])

  return {
    messages: messages as unknown as ChatMessage[],
    total,
    hasMore: total > offset + limit
  }
})
