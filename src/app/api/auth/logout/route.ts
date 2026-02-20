/**
 * API-роут выхода из аккаунта (POST /api/auth/logout).
 *
 * Завершает серверную сессию (помечает expired в auth_sessions)
 * и удаляет cookie.
 */
import { endUserSession } from '@/lib/auth'

export async function POST() {
  await endUserSession()
  return Response.json({ success: true })
}
