import { getCookie } from 'h3'
import type { ContentType } from '~/types/chat'

const CHAT_SESSION_COOKIE = 'pg19_chat_session'

interface SendRequest {
  chatId: string
  message: string
  contentType?: ContentType
  attachmentUrl?: string
  attachmentName?: string
  attachmentSize?: number
}

export default defineEventHandler(async (event) => {
  requireRateLimit(event, RATE_LIMIT_CONFIGS.chat)

  const body = await readBody<SendRequest>(event)

  if (!body.chatId) {
    throw createError({
      statusCode: 400,
      message: 'chatId обязателен'
    })
  }

  if (!body.message?.trim() && !body.attachmentUrl) {
    throw createError({
      statusCode: 400,
      message: 'Сообщение или вложение обязательно'
    })
  }

  const prisma = usePrisma()

  const chat = await prisma.chat.findUnique({
    where: { id: body.chatId }
  })

  if (!chat) {
    throw createError({
      statusCode: 404,
      message: 'Чат не найден'
    })
  }

  if (chat.status === 'closed') {
    throw createError({
      statusCode: 400,
      message: 'Чат закрыт'
    })
  }

  const sessionUser = await getUserFromSession(event)
  const chatSessionToken = getCookie(event, CHAT_SESSION_COOKIE)

  let senderName: string
  let senderId: string | null = null

  if (chat.user_id) {
    if (!sessionUser || sessionUser.id !== chat.user_id) {
      throw createError({
        statusCode: 403,
        message: 'Нет доступа к этому чату'
      })
    }
    senderId = sessionUser.id
    senderName = chat.user_name || 'Пользователь'
  } else {
    if (!chatSessionToken || chatSessionToken !== chat.session_token) {
      throw createError({
        statusCode: 403,
        message: 'Нет доступа к этому чату'
      })
    }
    senderName = chat.guest_name || 'Гость'
  }

  const newMessage = await prisma.chatMessage.create({
    data: {
      chat_id: body.chatId,
      sender_type: 'user',
      sender_id: senderId,
      sender_name: senderName,
      content: body.message?.trim() || '',
      content_type: body.contentType || 'text',
      attachment_url: body.attachmentUrl || null,
      attachment_name: body.attachmentName || null,
      attachment_size: body.attachmentSize ?? null
    }
  })

  await prisma.chat.update({
    where: { id: body.chatId },
    data: {
      unread_admin_count: chat.unread_admin_count + 1,
      last_message_at: new Date()
    }
  })

  if (chat.is_bot_active) {
    $fetch('/api/chat/bot/respond', {
      method: 'POST',
      body: {
        chatId: body.chatId,
        messageId: newMessage.id
      }
    }).catch((botError) => {
      console.error('Bot respond error:', botError)
    })
  }

  return {
    message: newMessage
  }
})
