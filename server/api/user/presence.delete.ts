// DELETE /api/user/presence — пометить пользователя как offline (при выходе).
// В client.users нет колонок online_status и last_seen_at — обновление БД отключено.

export default defineEventHandler(async (event) => {
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) {
    throw createError({ statusCode: 401, message: 'Требуется авторизация' })
  }

  return { success: true, status: 'offline' }
})
