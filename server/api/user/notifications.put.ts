/**
 * PUT /api/user/notifications
 * Заглушка: обновление настроек уведомлений (при наличии БД — сохранять).
 */
export default defineEventHandler(async (event) => {
  await requireUser(event)
  await readBody(event).catch(() => ({}))
  return { success: true }
})
