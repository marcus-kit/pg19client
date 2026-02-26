// POST /api/user/presence
// Heartbeat для обновления онлайн-статуса пользователя (вызывается клиентом каждые 30–60 с).
// В client.users нет колонок online_status и last_seen_at — обновление БД отключено.
// Чтобы включить онлайн-статус, добавьте миграцию с этими колонками.

export default defineEventHandler(async (event) => {
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) {
    throw createError({ statusCode: 401, message: 'Требуется авторизация' })
  }

  const body = await readBody<{ status?: 'online' | 'away' }>(event)
  const status = body?.status || 'online'
  if (!['online', 'away'].includes(status)) {
    throw createError({ statusCode: 400, message: 'Неверный статус' })
  }

  // Не обновляем БД — колонок last_seen_at / online_status в client.users нет
  return { success: true, status }
})
