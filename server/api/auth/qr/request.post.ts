import crypto from 'crypto'

/**
 * POST /api/auth/qr/request
 * Создаёт токен для QR-авторизации
 *
 * Response:
 * - token: уникальный токен (32 hex символа)
 * - qrUrl: URL для кодирования в QR (pg19qr://{token})
 * - expiresAt: время истечения
 * - expiresInSeconds: секунд до истечения (300 = 5 мин)
 */
export default defineEventHandler(async (event) => {
  // Rate limiting: 5 запросов за 5 минут
  requireRateLimit(event, RATE_LIMIT_CONFIGS.qrAuth)

  const supabase = useSupabaseServer()
  const clientId = getClientIdentifier(event)

  // Отменяем предыдущие pending запросы для этого IP
  await supabase
    .from('qr_auth_requests')
    .update({ status: 'expired' })
    .eq('ip_address', clientId)
    .eq('status', 'pending')

  // Генерируем токен
  const token = crypto.randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 минут

  // Создаём запрос в БД
  const { error: insertError } = await supabase
    .from('qr_auth_requests')
    .insert({
      token,
      status: 'pending',
      ip_address: clientId,
      user_agent: getHeader(event, 'user-agent') || null,
      expires_at: expiresAt.toISOString()
    })

  if (insertError) {
    console.error('[QrAuth] Insert error:', insertError)
    throw createError({
      statusCode: 500,
      message: 'Ошибка создания запроса'
    })
  }

  // QR URL — custom scheme для TG App
  const qrUrl = `pg19qr://${token}`

  console.log('[QrAuth] Request created:', { token })

  return {
    success: true,
    token,
    qrUrl,
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds: 300
  }
})
