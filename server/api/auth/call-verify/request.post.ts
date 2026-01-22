import crypto from 'crypto'

interface CallVerifyRequest {
  phone: string
}

/**
 * POST /api/auth/call-verify/request
 * Создание запроса на верификацию по входящему звонку
 */
export default defineEventHandler(async (event) => {
  // Rate limiting: 3 попытки за 5 минут
  requireRateLimit(event, RATE_LIMIT_CONFIGS.callVerify)

  const body = await readBody<CallVerifyRequest>(event)

  if (!body.phone) {
    throw createError({
      statusCode: 400,
      message: 'Укажите номер телефона'
    })
  }

  // Нормализация: оставляем только цифры, формат 79XXXXXXXXX
  const normalizedPhone = body.phone.replace(/\D/g, '').replace(/^8/, '7')

  if (!/^7\d{10}$/.test(normalizedPhone)) {
    throw createError({
      statusCode: 400,
      message: 'Неверный формат номера телефона'
    })
  }

  const supabase = useSupabaseServer()

  // В БД телефоны хранятся с + (например +79604555668)
  // Ищем и с + и без для совместимости
  const phoneWithPlus = `+${normalizedPhone}`

  // Ищем пользователя по телефону
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, status, phone')
    .or(`phone.eq.${phoneWithPlus},phone.eq.${normalizedPhone}`)
    .single()

  if (userError || !user) {
    throw createError({
      statusCode: 404,
      message: 'Пользователь с таким номером не найден'
    })
  }

  if (user.status === 'suspended' || user.status === 'terminated') {
    throw createError({
      statusCode: 403,
      message: 'Ваш аккаунт заблокирован'
    })
  }

  // Ищем аккаунт пользователя
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (accountError || !account) {
    throw createError({
      statusCode: 404,
      message: 'Аккаунт не найден'
    })
  }

  // Отменяем предыдущие pending запросы для этого телефона
  await supabase
    .from('phone_verification_requests')
    .update({ status: 'expired' })
    .eq('phone', normalizedPhone)
    .eq('status', 'pending')

  // Генерируем токен для polling
  const token = crypto.randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000) // 3 минуты

  // Создаём новый запрос
  const { error: insertError } = await supabase
    .from('phone_verification_requests')
    .insert({
      token,
      phone: normalizedPhone,
      user_id: user.id,
      account_id: account.id,
      expires_at: expiresAt.toISOString(),
      ip_address: getClientIdentifier(event)
    })

  if (insertError) {
    console.error('[CallVerify] Insert error:', insertError)
    throw createError({
      statusCode: 500,
      message: 'Ошибка создания запроса'
    })
  }

  const config = useRuntimeConfig()

  console.log('[CallVerify] Request created:', { phone: normalizedPhone, token })

  return {
    success: true,
    token,
    callNumber: config.public.beelineCallNumber || '+7 960 459-69-45',
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds: 180
  }
})
