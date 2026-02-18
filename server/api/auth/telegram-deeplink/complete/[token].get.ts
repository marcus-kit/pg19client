/**
 * GET /api/auth/telegram-deeplink/complete/:token
 * Завершение авторизации через Telegram deeplink
 *
 * Для purpose='login': создаёт сессию, возвращает user + account
 * Для purpose='link': привязывает Telegram к пользователю, возвращает telegram данные
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

  // Ищем verified запрос по токену
  const { data: authRequest, error: requestError } = await supabase
    .from('telegram_auth_requests')
    .select('*')
    .eq('token', token)
    .eq('status', 'verified')
    .single()

  if (requestError || !authRequest) {
    throw createError({
      statusCode: 404,
      message: 'Запрос не найден или не подтверждён'
    })
  }

  // Помечаем токен как использованный
  await supabase
    .from('telegram_auth_requests')
    .update({ status: 'used' })
    .eq('id', authRequest.id)

  // Обработка в зависимости от purpose
  if (authRequest.purpose === 'link') {
    return await handleLinkFlow(event, supabase, authRequest)
  } else {
    return await handleLoginFlow(event, supabase, authRequest)
  }
})

/**
 * Обработка login flow — создание сессии и возврат данных пользователя
 */
async function handleLoginFlow(event: any, supabase: any, authRequest: any) {
  // Ищем пользователя по telegram_id
  const { data: user, error: userError } = await supabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      middle_name,
      phone,
      email,
      telegram_username,
      telegram_id,
      birth_date,
      avatar,
      vk_id,
      status
    `)
    .eq('telegram_id', authRequest.telegram_id.toString())
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

  // Загружаем данные аккаунта
  const { data: account, error: accountError } = await supabase
    .from('contracts')
    .select(`
      id,
      contract_number,
      balance,
      status,
      address_full,
      start_date
    `)
    .eq('user_id', user.id)
    .single()

  if (accountError || !account) {
    throw createError({
      statusCode: 500,
      message: 'Ошибка загрузки данных аккаунта'
    })
  }

  // Получаем подписки для определения тарифа
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      id,
      status,
      services (
        id,
        name,
        type
      )
    `)
    .eq('account_id', account.id)
    .eq('status', 'active')

  const internetSub = subscriptions?.find((s: any) => s.services?.type === 'internet')
  const tariffName = internetSub?.services?.name || 'Не подключен'

  // Обновляем telegram_username если изменился
  if (authRequest.telegram_username && authRequest.telegram_username !== user.telegram_username) {
    await supabase
      .from('users')
      .update({ telegram_username: authRequest.telegram_username })
      .eq('id', user.id)
  }

  // Создаём сессию авторизации
  await createUserSession(
    event,
    user.id,
    account.id,
    'telegram',
    authRequest.telegram_id.toString(),
    {
      telegram_username: authRequest.telegram_username,
      auth_method: 'deeplink'
    }
  )

  // Сбрасываем rate limit после успешного входа
  const clientIp = getClientIdentifier(event)
  resetRateLimit(clientIp, 'auth:telegram-deeplink')

  return {
    success: true,
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      middleName: user.middle_name,
      phone: user.phone || '',
      email: user.email || '',
      telegram: authRequest.telegram_username ? `@${authRequest.telegram_username}` : '',
      telegramId: authRequest.telegram_id.toString(),
      vkId: user.vk_id || '',
      avatar: user.avatar || null,
      birthDate: user.birth_date || null,
      role: 'user'
    },
    account: {
      contractNumber: account.contract_number,
      balance: account.balance,
      status: account.status,
      tariff: tariffName,
      address: account.address_full || '',
      startDate: account.start_date
    }
  }
}

/**
 * Обработка link flow — привязка Telegram к существующему пользователю
 */
async function handleLinkFlow(event: any, supabase: any, authRequest: any) {
  // Проверяем что telegram_id не занят другим пользователем
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', authRequest.telegram_id.toString())
    .single()

  if (existingUser && existingUser.id !== authRequest.user_id) {
    throw createError({
      statusCode: 409,
      message: 'Этот Telegram уже привязан к другому аккаунту'
    })
  }

  // Привязываем Telegram к пользователю
  const { error: updateError } = await supabase
    .from('users')
    .update({
      telegram_id: authRequest.telegram_id.toString(),
      telegram_username: authRequest.telegram_username || null
    })
    .eq('id', authRequest.user_id)

  if (updateError) {
    console.error('[TelegramDeeplink] Link update error:', updateError)
    throw createError({
      statusCode: 500,
      message: 'Ошибка привязки Telegram'
    })
  }

  // Сбрасываем rate limit
  const clientIp = getClientIdentifier(event)
  resetRateLimit(clientIp, 'auth:telegram-deeplink')

  return {
    success: true,
    telegramId: authRequest.telegram_id.toString(),
    telegramUsername: authRequest.telegram_username || null
  }
}
