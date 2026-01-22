/**
 * GET /api/auth/call-verify/complete/[token]
 * Завершение авторизации после получения Realtime события verified
 * Создаёт сессию и возвращает данные пользователя
 */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Token обязателен'
    })
  }

  const supabase = useSupabaseServer()

  // Ищем verified запрос по токену
  const { data: request, error: requestError } = await supabase
    .from('phone_verification_requests')
    .select('*')
    .eq('token', token)
    .eq('status', 'verified')
    .single()

  if (requestError || !request) {
    throw createError({
      statusCode: 404,
      message: 'Запрос не найден или не подтверждён'
    })
  }

  // Загружаем данные пользователя
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
      vk_id
    `)
    .eq('id', request.user_id)
    .single()

  if (userError || !user) {
    throw createError({
      statusCode: 500,
      message: 'Ошибка загрузки данных пользователя'
    })
  }

  // Загружаем данные аккаунта
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select(`
      id,
      contract_number,
      balance,
      status,
      address_full,
      start_date
    `)
    .eq('id', request.account_id)
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

  // Создаём сессию авторизации
  await createUserSession(event, user.id, account.id, 'phone', request.phone)

  // Сбрасываем rate limit после успешного входа
  const clientIp = getClientIdentifier(event)
  resetRateLimit(clientIp, 'auth:call-verify')

  return {
    success: true,
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      middleName: user.middle_name,
      phone: user.phone || '',
      email: user.email || '',
      telegram: user.telegram_username ? `@${user.telegram_username}` : '',
      telegramId: user.telegram_id || null,
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
})
