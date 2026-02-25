/**
 * GET /api/auth/telegram-deeplink/status/:token
 * Polling fallback — проверка статуса токена авторизации
 *
 * Response:
 * - status: 'pending' | 'verified' | 'expired' | 'used'
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

  // Получаем статус запроса
  const { data: authRequest, error } = await supabase
    .schema('client').from('telegram_auth_requests')
    .select('status, expires_at')
    .eq('token', token)
    .single()

  if (error || !authRequest) {
    throw createError({
      statusCode: 404,
      message: 'Запрос не найден'
    })
  }

  // Проверяем истечение для pending запросов
  if (authRequest.status === 'pending' && new Date(authRequest.expires_at) < new Date()) {
    // Обновляем статус на expired
    await supabase
      .schema('client').from('telegram_auth_requests')
      .update({ status: 'expired' })
      .eq('token', token)

    return { status: 'expired' }
  }

  return { status: authRequest.status }
})
