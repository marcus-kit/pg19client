import crypto from 'crypto'

interface DeeplinkRequest {
  purpose: 'login' | 'link'
  userId?: string // Обязателен для purpose='link'
}

/**
 * POST /api/auth/telegram-deeplink/request
 * Создаёт токен авторизации и возвращает deeplink URL для Telegram
 *
 * Body:
 * - purpose: 'login' — для входа через Telegram
 * - purpose: 'link' — для привязки Telegram к существующему аккаунту
 * - userId/accountId — обязательны для purpose='link'
 *
 * Response:
 * - token: уникальный токен для отслеживания
 * - deeplink: URL для открытия Telegram (https://t.me/bot?start=AUTH_token)
 * - expiresAt: время истечения
 * - expiresInSeconds: секунд до истечения
 */
export default defineEventHandler(async (event) => {
  // Rate limiting: 5 запросов за 5 минут
  requireRateLimit(event, RATE_LIMIT_CONFIGS.telegramDeeplink)

  const body = await readBody<DeeplinkRequest>(event)
  const config = useRuntimeConfig()

  // Валидация purpose
  if (!body.purpose || !['login', 'link'].includes(body.purpose)) {
    throw createError({
      statusCode: 400,
      message: 'Укажите purpose: login или link'
    })
  }

  // Для link flow требуется userId
  if (body.purpose === 'link' && !body.userId) {
    throw createError({
      statusCode: 400,
      message: 'Для привязки Telegram укажите userId'
    })
  }

  const supabase = useSupabaseServer()

  let accountId: string | null = null

  // Для link flow проверяем пользователя и получаем account_id
  if (body.purpose === 'link') {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id')
      .eq('id', body.userId)
      .single()

    if (userError || !user) {
      throw createError({
        statusCode: 404,
        message: 'Пользователь не найден'
      })
    }

    // Проверяем что Telegram ещё не привязан
    if (user.telegram_id) {
      throw createError({
        statusCode: 409,
        message: 'Telegram уже привязан к этому аккаунту'
      })
    }

    // Получаем account_id по user_id
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', body.userId)
      .single()

    if (accountError || !account) {
      throw createError({
        statusCode: 404,
        message: 'Аккаунт не найден'
      })
    }

    accountId = account.id
  }

  // Отменяем предыдущие pending запросы для этого IP (для login)
  // или для этого userId (для link)
  const clientId = getClientIdentifier(event)

  if (body.purpose === 'login') {
    await supabase
      .from('telegram_auth_requests')
      .update({ status: 'expired' })
      .eq('ip_address', clientId)
      .eq('purpose', 'login')
      .eq('status', 'pending')
  } else {
    await supabase
      .from('telegram_auth_requests')
      .update({ status: 'expired' })
      .eq('user_id', body.userId)
      .eq('purpose', 'link')
      .eq('status', 'pending')
  }

  // Генерируем токен
  const token = crypto.randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 минут

  // Создаём запрос в БД
  const { error: insertError } = await supabase
    .from('telegram_auth_requests')
    .insert({
      token,
      purpose: body.purpose,
      user_id: body.userId || null,
      account_id: accountId,
      ip_address: clientId,
      user_agent: getHeader(event, 'user-agent') || null,
      expires_at: expiresAt.toISOString()
    })

  if (insertError) {
    console.error('[TelegramDeeplink] Insert error:', insertError)
    throw createError({
      statusCode: 500,
      message: 'Ошибка создания запроса'
    })
  }

  // Формируем deeplink
  const botUsername = config.public.telegramBotUsername || 'PG19CONNECTBOT'
  const deeplink = `https://t.me/${botUsername}?start=AUTH_${token}`

  console.log('[TelegramDeeplink] Request created:', { purpose: body.purpose, token })

  return {
    success: true,
    token,
    deeplink,
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds: 300
  }
})
