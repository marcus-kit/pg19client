/**
 * GET /api/auth/qr/complete/:token
 * Завершение QR-авторизации — создание сессии
 *
 * Response:
 * - success: true
 * - user: данные пользователя
 * - account: данные аккаунта
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

  // Ищем confirmed запрос по токену
  const { data: qrRequest, error: requestError } = await supabase
    .from('qr_auth_requests')
    .select('*')
    .eq('token', token)
    .eq('status', 'confirmed')
    .single()

  if (requestError || !qrRequest) {
    throw createError({
      statusCode: 404,
      message: 'Запрос не найден или не подтверждён'
    })
  }

  // Помечаем токен как использованный
  await supabase
    .from('qr_auth_requests')
    .update({ status: 'used' })
    .eq('id', qrRequest.id)

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
      vk_id,
      status
    `)
    .eq('id', qrRequest.user_id)
    .single()

  if (userError || !user) {
    throw createError({
      statusCode: 500,
      message: 'Ошибка загрузки данных пользователя'
    })
  }

  // Загружаем данные контракта
  const { data: contract, error: contractError } = await supabase
    .from('contracts_view')
    .select(`
      id,
      contract_number,
      balance,
      status,
      address_full,
      start_date
    `)
    .eq('id', qrRequest.account_id)
    .single()

  if (contractError || !contract) {
    throw createError({
      statusCode: 500,
      message: 'Ошибка загрузки данных контракта'
    })
  }

  // Получаем подписки для определения тарифа
  const { data: subscriptions } = await supabase
    .from('subscriptions_view')
    .select(`
      id,
      status,
      service_name,
      service_type
    `)
    .eq('contract_id', contract.id)
    .eq('status', 'active')

  const internetSub = subscriptions?.find((s: any) => s.service_type === 'internet')
  const tariffName = internetSub?.service_name || 'Не подключен'

  // Создаём сессию авторизации
  await createUserSession(
    event,
    user.id,
    contract.id,
    'qr',
    qrRequest.telegram_id,
    {
      telegram_username: qrRequest.telegram_username,
      auth_method: 'qr'
    }
  )

  // Сбрасываем rate limit после успешного входа
  const clientIp = getClientIdentifier(event)
  resetRateLimit(clientIp, 'auth:qr')

  console.log('[QrAuth] Complete success:', { token, userId: user.id })

  return {
    success: true,
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      middleName: user.middle_name,
      phone: user.phone || '',
      email: user.email || '',
      telegram: qrRequest.telegram_username ? `@${qrRequest.telegram_username}` : '',
      telegramId: qrRequest.telegram_id,
      vkId: user.vk_id || '',
      avatar: user.avatar || null,
      birthDate: user.birth_date || null,
      role: 'user'
    },
    account: {
      contractNumber: contract.contract_number,
      balance: contract.balance,
      status: contract.status,
      tariff: tariffName,
      address: contract.address_full || '',
      startDate: contract.start_date
    }
  }
})
