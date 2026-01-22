import { getCookie } from 'h3'

const CHAT_SESSION_COOKIE = 'pg19_chat_session'

import type { ContentType } from '~/types/chat'

interface SendRequest {
  chatId: string
  message: string
  // Вложения
  contentType?: ContentType
  attachmentUrl?: string
  attachmentName?: string
  attachmentSize?: number
}

export default defineEventHandler(async (event) => {
  // Rate limiting: 30 сообщений в минуту
  requireRateLimit(event, RATE_LIMIT_CONFIGS.chat)

  const body = await readBody<SendRequest>(event)

  if (!body.chatId) {
    throw createError({
      statusCode: 400,
      message: 'chatId обязателен'
    })
  }

  // Сообщение обязательно только если нет вложения
  if (!body.message?.trim() && !body.attachmentUrl) {
    throw createError({
      statusCode: 400,
      message: 'Сообщение или вложение обязательно'
    })
  }

  const supabase = useSupabaseServer()

  // Проверяем чат
  const { data: chat } = await supabase
    .from('chats')
    .select('*')
    .eq('id', body.chatId)
    .single()

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

  // Проверяем ownership чата
  const sessionUser = await getUserFromSession(event)
  const chatSessionToken = getCookie(event, CHAT_SESSION_COOKIE)

  let senderName: string
  let senderId: string | null = null

  if (chat.user_id) {
    // Чат принадлежит авторизованному пользователю
    if (!sessionUser || sessionUser.id !== chat.user_id) {
      throw createError({
        statusCode: 403,
        message: 'Нет доступа к этому чату'
      })
    }
    senderId = sessionUser.id
    senderName = chat.user_name || 'Пользователь'
  } else {
    // Гостевой чат - проверяем по токену сессии
    if (!chatSessionToken || chatSessionToken !== chat.session_token) {
      throw createError({
        statusCode: 403,
        message: 'Нет доступа к этому чату'
      })
    }
    senderName = chat.guest_name || 'Гость'
  }

  // Сохраняем сообщение
  const { data: newMessage, error: msgError } = await supabase
    .from('chat_messages')
    .insert({
      chat_id: body.chatId,
      sender_type: 'user',
      sender_id: senderId,
      sender_name: senderName,
      content: body.message?.trim() || '',
      content_type: body.contentType || 'text',
      attachment_url: body.attachmentUrl || null,
      attachment_name: body.attachmentName || null,
      attachment_size: body.attachmentSize || null
    })
    .select()
    .single()

  if (msgError) {
    console.error('Error saving message:', msgError)
    throw createError({
      statusCode: 500,
      message: 'Ошибка при сохранении сообщения'
    })
  }

  // Обновляем чат: счётчик непрочитанных + время последнего сообщения
  await supabase
    .from('chats')
    .update({
      unread_admin_count: (chat.unread_admin_count || 0) + 1,
      last_message_at: new Date().toISOString()
    })
    .eq('id', body.chatId)

  // Триггерим AI-бота (если активен для этого чата)
  if (chat.is_bot_active) {
    // Fire-and-forget — не ждём ответа бота
    $fetch('/api/chat/bot/respond', {
      method: 'POST',
      body: {
        chatId: body.chatId,
        messageId: newMessage.id
      }
    }).catch((botError) => {
      // Логируем ошибку, но не блокируем ответ пользователю
      console.error('Bot respond error:', botError)
    })
  }

  // TODO: уведомление в Telegram для операторов

  return {
    message: newMessage
  }
})
