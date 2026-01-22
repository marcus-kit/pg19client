/**
 * Ручная эскалация чата на оператора
 *
 * Вызывается когда пользователь нажимает кнопку "Позвать оператора"
 */

import { getCookie } from 'h3'

const CHAT_SESSION_COOKIE = 'pg19_chat_session'

interface EscalateRequest {
  chatId: string
}

export default defineEventHandler(async (event) => {
  // Rate limiting: 5 эскалаций в минуту
  requireRateLimit(event, {
    maxAttempts: 5,
    windowMs: 60 * 1000,
    blockDurationMs: 60 * 1000,
    action: 'chat_escalate'
  })

  const body = await readBody<EscalateRequest>(event)

  if (!body.chatId) {
    throw createError({
      statusCode: 400,
      message: 'chatId обязателен'
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
      message: 'Чат уже закрыт'
    })
  }

  if (!chat.is_bot_active) {
    // Бот уже отключён — чат уже эскалирован
    return { success: true, already_escalated: true }
  }

  // Проверяем ownership чата
  const sessionUser = await getUserFromSession(event)
  const chatSessionToken = getCookie(event, CHAT_SESSION_COOKIE)

  if (chat.user_id) {
    // Чат принадлежит авторизованному пользователю
    if (!sessionUser || sessionUser.id !== chat.user_id) {
      throw createError({
        statusCode: 403,
        message: 'Нет доступа к этому чату'
      })
    }
  } else {
    // Гостевой чат — проверяем по токену сессии
    if (!chatSessionToken || chatSessionToken !== chat.session_token) {
      throw createError({
        statusCode: 403,
        message: 'Нет доступа к этому чату'
      })
    }
  }

  // Эскалируем чат
  await supabase.rpc('escalate_chat_to_operator', {
    p_chat_id: body.chatId,
    p_reason: 'user_request'
  })

  return { success: true }
})
