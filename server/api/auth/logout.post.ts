/**
 * POST /api/auth/logout
 * Завершает текущую сессию (инвалидация по jti, очистка cookie).
 */
export default defineEventHandler(async (event) => {
  await endUserSession(event)
  return { success: true }
})
