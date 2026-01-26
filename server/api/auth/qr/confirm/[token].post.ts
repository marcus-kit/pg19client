import { validateInitData, parseInitData } from '~~/server/utils/telegramAuth'

interface ConfirmBody {
  initData: string
}

/**
 * POST /api/auth/qr/confirm/:token
 * Вызывается из TG App при подтверждении входа
 *
 * Body:
 * - initData: строка initData от Telegram
 *
 * Response:
 * - success: true
 */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  const body = await readBody<ConfirmBody>(event)
  const config = useRuntimeConfig()

  if (!token || token.length !== 32) {
    throw createError({
      statusCode: 400,
      message: 'Неверный токен'
    })
  }

  if (!body.initData) {
    throw createError({
      statusCode: 400,
      message: 'Отсутствует initData'
    })
  }

  // Валидируем initData
  try {
    validateInitData(body.initData, config.telegramBotToken, 86400)
  } catch (e: any) {
    throw createError({
      statusCode: 401,
      message: e.message || 'Невалидный initData'
    })
  }

  const parsed = parseInitData(body.initData)
  const telegramUser = parsed.user

  if (!telegramUser?.id) {
    throw createError({
      statusCode: 400,
      message: 'Не удалось получить данные пользователя Telegram'
    })
  }

  const supabase = useSupabaseServer()

  // Ищем QR-запрос в статусе 'scanned'
  const { data: qrRequest, error: requestError } = await supabase
    .from('qr_auth_requests')
    .select('*')
    .eq('token', token)
    .eq('status', 'scanned')
    .single()

  if (requestError || !qrRequest) {
    throw createError({
      statusCode: 404,
      message: 'Токен не найден или не в статусе ожидания подтверждения'
    })
  }

  // Проверяем что подтверждает тот же пользователь, который сканировал
  if (qrRequest.telegram_id !== telegramUser.id.toString()) {
    throw createError({
      statusCode: 403,
      message: 'Подтверждение должно быть от того же пользователя'
    })
  }

  // Проверяем срок действия
  if (new Date(qrRequest.expires_at) < new Date()) {
    await supabase
      .from('qr_auth_requests')
      .update({ status: 'expired' })
      .eq('id', qrRequest.id)

    throw createError({
      statusCode: 410,
      message: 'Срок действия QR-кода истёк'
    })
  }

  // Обновляем статус на 'confirmed'
  const { error: updateError } = await supabase
    .from('qr_auth_requests')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString()
    })
    .eq('id', qrRequest.id)

  if (updateError) {
    console.error('[QrAuth] Confirm update error:', updateError)
    throw createError({
      statusCode: 500,
      message: 'Ошибка обновления статуса'
    })
  }

  // Отправляем Realtime broadcast
  const channel = supabase.channel(`qr-auth:${token}`)
  await channel.send({
    type: 'broadcast',
    event: 'confirmed',
    payload: { status: 'confirmed' }
  })
  supabase.removeChannel(channel)

  console.log('[QrAuth] QR confirmed:', { token, telegramId: telegramUser.id })

  return {
    success: true
  }
})
