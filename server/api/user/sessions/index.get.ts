/**
 * GET /api/user/sessions
 * Заглушка: список сессий можно строить из client.auth_sessions при необходимости.
 */
export default defineEventHandler(async (event) => {
  await requireUser(event)
  return [] as { id: string; device: string; browser: string; ip: string; location: string; lastActive: string; current: boolean }[]
})
