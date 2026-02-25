/**
 * DELETE /api/user/sessions/[sessionId]
 * Заглушка: завершение сессии (при необходимости — удалять из client.auth_sessions).
 */
export default defineEventHandler(async (event) => {
  await requireUser(event)
  getRouterParam(event, 'sessionId')
  return { success: true }
})
