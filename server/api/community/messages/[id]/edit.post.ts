// POST /api/community/messages/:id/edit
// Редактировать сообщение (только свои сообщения)

export default defineEventHandler(async (event) => {
  const messageId = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ content: string }>(event)

  if (!messageId) {
    throw createError({ statusCode: 400, message: 'ID сообщения обязателен' })
  }

  if (!body.content?.trim()) {
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
    .select('id, user_id, room_id, is_deleted')
    .eq('id', messageId)
    .single()

  if (msgError || !message) {
    throw createError({ statusCode: 404, message: 'Сообщение не найдено' })
  }

  // Проверяем права: только автор может редактировать
  if (message.user_id !== sessionUser.id) {
    throw createError({ statusCode: 403, message: 'Можно редактировать только свои сообщения' })
  }

  // Нельзя редактировать удалённые сообщения
  if (message.is_deleted) {
    throw createError({ statusCode: 400, message: 'Нельзя редактировать удалённое сообщение' })
  }

  // Обновляем сообщение
  const { data: updatedMessage, error: updateError } = await supabase
    .from('community_messages')
    .update({
      content: body.content.trim(),
      updated_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .select(`
      id,
      room_id,
      user_id,
      content,
      content_type,
      image_url,
      image_width,
      image_height,
      is_pinned,
      is_deleted,
      deleted_at,
      deleted_by,
      reply_to_id,
      created_at,
      updated_at,
      user:users!community_messages_user_id_fkey (
        id,
        first_name,
        last_name,
        avatar
      )
    `)
    .single()

  if (updateError) {
    console.error('Error updating message:', updateError)
    throw createError({ statusCode: 500, message: 'Ошибка редактирования' })
  }

  // Форматируем ответ
  const result: any = {
    id: updatedMessage.id,
    roomId: updatedMessage.room_id,
    userId: updatedMessage.user_id,
    content: updatedMessage.content,
    contentType: updatedMessage.content_type,
    imageUrl: updatedMessage.image_url,
    imageWidth: updatedMessage.image_width,
    imageHeight: updatedMessage.image_height,
    isPinned: updatedMessage.is_pinned,
    isDeleted: updatedMessage.is_deleted,
    deletedAt: updatedMessage.deleted_at,
    deletedBy: updatedMessage.deleted_by,
    replyToId: updatedMessage.reply_to_id,
    createdAt: updatedMessage.created_at,
    updatedAt: updatedMessage.updated_at,
    user: updatedMessage.user ? {
      id: updatedMessage.user.id,
      firstName: updatedMessage.user.first_name,
      lastName: updatedMessage.user.last_name,
      avatar: updatedMessage.user.avatar
    } : undefined
  }

  return { message: result }
})
