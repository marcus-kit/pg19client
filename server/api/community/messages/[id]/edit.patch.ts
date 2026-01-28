// PATCH /api/community/messages/:id/edit
// Редактировать сообщение (только автор, только текст, если не удалено)

import type { CommunityMessage, EditMessageRequest, EditMessageResponse } from '~/types/community'

interface MessageRow {
  id: string
  room_id: string
  user_id: string
  content: string
  content_type: 'text' | 'image' | 'system'
  image_url: string | null
  image_width: number | null
  image_height: number | null
  is_pinned: boolean
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
  reply_to_id: string | null
  created_at: string
  updated_at: string
  user: {
    id: string
    first_name: string
    last_name: string
    avatar?: string | null
  } | null
}

export default defineEventHandler(async (event): Promise<EditMessageResponse> => {
  const messageId = String(getRouterParam(event, 'id') || '').trim()
  if (!messageId) {
    throw createError({ statusCode: 400, message: 'ID сообщения обязателен' })
  }

  const body = await readBody<EditMessageRequest>(event)
  const content = (body.content || '').trim()
  if (!content) {
    throw createError({ statusCode: 400, message: 'Сообщение не может быть пустым' })
  }

  const supabase = useSupabaseServer()

  // Авторизация
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) {
    throw createError({ statusCode: 401, message: 'Требуется авторизация' })
  }

  // Получаем сообщение
  const { data: message, error: msgError } = await supabase
    .from('community_messages')
    .select('id, room_id, user_id, content, content_type, is_deleted')
    .eq('id', messageId)
    .single()

  if (msgError) {
    console.error('Error fetching message for edit:', msgError)
  }

  if (!message) {
    throw createError({ statusCode: 404, message: 'Сообщение не найдено' })
  }

  if (message.is_deleted) {
    throw createError({ statusCode: 400, message: 'Сообщение удалено' })
  }

  if (message.content_type !== 'text') {
    throw createError({ statusCode: 400, message: 'Можно редактировать только текстовые сообщения' })
  }

  // Только автор
  if (message.user_id !== sessionUser.id) {
    throw createError({ statusCode: 403, message: 'Можно редактировать только свои сообщения' })
  }

  // Проверяем мут (редактирование = действие в чате)
  const { data: muteData, error: muteError } = await supabase.rpc('check_community_mute', {
    p_room_id: message.room_id,
    p_user_id: sessionUser.id
  })

  if (muteError) {
    console.error('Error checking mute (edit):', muteError)
  }

  const muteInfo = muteData?.[0] || { is_muted: false, expires_at: null }
  if (muteInfo.is_muted) {
    throw createError({ statusCode: 403, message: formatMuteMessage(muteInfo.expires_at) })
  }

  // Если контент не изменился — просто вернём текущее сообщение
  if (content === (message.content || '').trim()) {
    const full = await loadFullMessage(supabase, messageId)
    return { message: full }
  }

  // Обновляем
  const { error: updateError } = await supabase
    .from('community_messages')
    .update({ content })
    .eq('id', messageId)

  if (updateError) {
    console.error('Error updating message:', updateError)
    throw createError({ statusCode: 500, message: 'Ошибка редактирования сообщения' })
  }

  // Возвращаем обновлённое сообщение
  const full = await loadFullMessage(supabase, messageId)
  return { message: full }
})

async function loadFullMessage(
  supabase: ReturnType<typeof useSupabaseServer>,
  messageId: string
): Promise<CommunityMessage> {
  const { data: row, error } = await supabase
    .from('community_messages')
    .select(`
      *,
      user:users!community_messages_user_id_fkey(id, first_name, last_name, avatar)
    `)
    .eq('id', messageId)
    .single()

  if (error) {
    console.error('Error fetching edited message:', error)
    throw createError({ statusCode: 500, message: 'Ошибка загрузки сообщения' })
  }

  const msg = row as MessageRow
  const user = msg.user as any
  return {
    id: msg.id,
    roomId: msg.room_id,
    userId: msg.user_id,
    content: msg.is_deleted ? 'Сообщение удалено' : msg.content,
    contentType: msg.content_type,
    imageUrl: msg.image_url,
    imageWidth: msg.image_width,
    imageHeight: msg.image_height,
    isPinned: msg.is_pinned,
    isDeleted: msg.is_deleted,
    deletedAt: msg.deleted_at,
    deletedBy: msg.deleted_by,
    replyToId: msg.reply_to_id,
    createdAt: msg.created_at,
    updatedAt: msg.updated_at,
    user: user ? {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      avatar: user.avatar
    } : undefined,
    replyTo: null
  }
}

function formatMuteMessage(mutedUntil?: string | null): string {
  if (!mutedUntil) return 'Вы не можете писать'

  const date = new Date(mutedUntil)
  const formatted = date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
  return `Вы не можете писать до ${formatted}`
}

