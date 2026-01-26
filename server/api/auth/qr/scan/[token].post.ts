import { validateInitData, parseInitData } from '~~/server/utils/telegramAuth'

interface ScanBody {
  initData: string
}

/**
 * POST /api/auth/qr/scan/:token
 * Вызывается из TG App при сканировании QR-кода
 *
 * Body:
 * - initData: строка initData от Telegram
 *
 * Response:
 * - success: true
 * - deviceInfo: информация об устройстве для подтверждения
 */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  const body = await readBody<ScanBody>(event)
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

  // Ищем QR-запрос
  const { data: qrRequest, error: requestError } = await supabase
    .from('qr_auth_requests')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (requestError || !qrRequest) {
    throw createError({
      statusCode: 404,
      message: 'Токен не найден или уже использован'
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

  // Ищем пользователя по telegram_id
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, first_name, last_name, status')
    .eq('telegram_id', telegramUser.id.toString())
    .single()

  if (userError || !user) {
    throw createError({
      statusCode: 404,
      message: 'Пользователь с этим Telegram не найден. Войдите по договору и привяжите Telegram в профиле.'
    })
  }

  if (user.status === 'suspended' || user.status === 'terminated') {
    throw createError({
      statusCode: 403,
      message: 'Ваш аккаунт заблокирован'
    })
  }

  // Получаем account
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (accountError || !account) {
    throw createError({
      statusCode: 500,
      message: 'Ошибка загрузки данных аккаунта'
    })
  }

  // Обновляем статус на 'scanned'
  const { error: updateError } = await supabase
    .from('qr_auth_requests')
    .update({
      status: 'scanned',
      user_id: user.id,
      account_id: account.id,
      telegram_id: telegramUser.id.toString(),
      telegram_username: telegramUser.username || null,
      scanned_at: new Date().toISOString()
    })
    .eq('id', qrRequest.id)

  if (updateError) {
    console.error('[QrAuth] Scan update error:', updateError)
    throw createError({
      statusCode: 500,
      message: 'Ошибка обновления статуса'
    })
  }

  // Отправляем Realtime broadcast
  const channel = supabase.channel(`qr-auth:${token}`)
  await channel.send({
    type: 'broadcast',
    event: 'scanned',
    payload: { status: 'scanned' }
  })
  supabase.removeChannel(channel)

  console.log('[QrAuth] QR scanned:', { token, telegramId: telegramUser.id })

  // Парсим User-Agent для отображения в TG App
  const userAgent = qrRequest.user_agent || 'Unknown'
  const browser = parseBrowser(userAgent)
  const os = parseOS(userAgent)

  return {
    success: true,
    deviceInfo: {
      ip: qrRequest.ip_address || 'Unknown',
      browser,
      os,
      userAgent
    }
  }
})

/**
 * Простой парсер браузера из User-Agent
 */
function parseBrowser(ua: string): string {
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'
  return 'Unknown'
}

/**
 * Простой парсер ОС из User-Agent
 */
function parseOS(ua: string): string {
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  return 'Unknown'
}
