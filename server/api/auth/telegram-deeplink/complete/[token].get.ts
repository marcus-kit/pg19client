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

  // Ищем verified запрос по токену (схема client)
  const { data: authRequest, error: requestError } = await supabase
    .schema('client')
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
    .schema('client')
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
  // Ищем пользователя по telegram_id (схема client)
  const { data: user, error: userError } = await supabase
    .schema('client')
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

  // Загружаем один из аккаунтов пользователя (client.accounts)
  const { data: account, error: accountError } = await supabase
    .schema('client')
    .from('accounts')
    .select('id, contract_id, contract_number, balance, status, address_full, start_date')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (accountError) {
    throw createError({
      statusCode: 500,
      message: 'Ошибка загрузки данных аккаунта'
    })
  }

  let tariffName = 'Не подключен'
  if (account?.contract_id) {
    const { data: contractServices } = await supabase
      .schema('billing')
      .from('contract_services')
      .select('name, type')
      .eq('contract_id', account.contract_id)
      .eq('is_active', true)
    const internetService = contractServices?.find((s: { type?: string }) => s.type === 'internet')
    tariffName = internetService?.name ?? contractServices?.[0]?.name ?? tariffName
  }

  if (authRequest.telegram_username && authRequest.telegram_username !== user.telegram_username) {
    await supabase
      .schema('client')
      .from('users')
      .update({ telegram_username: authRequest.telegram_username })
      .eq('id', user.id)
  }

  await createUserSession(
    event,
    user.id,
    account?.id ?? null,
    'telegram',
    authRequest.telegram_id.toString(),
    {
      telegram_username: authRequest.telegram_username,
      auth_method: 'deeplink'
    }
  )

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
    account: account
      ? {
          contractNumber: account.contract_number,
          balance: Number(account.balance),
          status: account.status,
          tariff: tariffName,
          address: account.address_full || '',
          startDate: account.start_date
        }
      : null
  }
}

/**
 * Обработка link flow — привязка Telegram к существующему пользователю
 */
async function handleLinkFlow(event: any, supabase: any, authRequest: any) {
  // Проверяем что telegram_id не занят другим пользователем
  const { data: existingUser } = await supabase
    .schema('client')
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
    .schema('client')
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
