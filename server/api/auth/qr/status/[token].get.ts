/**
 * GET /api/auth/qr/status/:token
 * Возвращает текущий статус QR-токена (для polling)
 *
 * Response:
 * - status: 'pending' | 'scanned' | 'confirmed' | 'expired' | 'used'
 */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token || token.length !== 32) {
    throw createError({
      statusCode: 400,
      message: 'Неверный токен'
    })
  }

  const supabase = useSupabaseServer()

  const { data: request, error } = await supabase
    .from('qr_auth_requests')
    .select('status, expires_at')
    .eq('token', token)
    .single()

  if (error || !request) {
    throw createError({
      statusCode: 404,
      message: 'Токен не найден'
    })
  }

  // Проверяем срок действия
  if (request.status === 'pending' && new Date(request.expires_at) < new Date()) {
    // Помечаем как истёкший
    await supabase
      .from('qr_auth_requests')
      .update({ status: 'expired' })
      .eq('token', token)

    return { status: 'expired' }
  }

  return { status: request.status }
})
