interface ContractAuthData {
  /** Номер договора или логин */
  login: string
  /** Пароль (для будущей проверки; пока не используется) */
  password: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ContractAuthData>(event)

  if (!body.login?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Введите номер договора или логин'
    })
  }

  const login = body.login.trim()
  // Номер договора — только цифры
  const contractNum = /^\d+$/.test(login) ? parseInt(login, 10) : null
  if (contractNum == null) {
    throw createError({
      statusCode: 400,
      message: 'Введите номер договора (цифры)'
    })
  }

  const supabase = useSupabaseServer()

  // Ищем аккаунт по номеру договора (в БД — таблица client.contracts)
  const { data: account, error: accountError } = await supabase
    .from('contracts')
    .select(`
      id,
      user_id,
      contract_number,
      balance,
      status,
      address_full,
      start_date
    `)
    .eq('contract_number', contractNum)
    .single()

  if (accountError || !account) {
    throw createError({
      statusCode: 404,
      message: 'Договор не найден'
    })
  }

  // Получаем пользователя
  const { data: user, error: userError } = await supabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      middle_name,
      full_name,
      email,
      phone,
      telegram_id,
      telegram_username,
      birth_date,
      avatar,
      vk_id,
      status
    `)
    .eq('id', account.user_id)
    .single()

  if (userError || !user) {
    throw createError({
      statusCode: 404,
      message: 'Пользователь не найден'
    })
  }

  // TODO: когда в БД появится поле пароля — проверять body.password
  void body.password

  // Проверяем статус пользователя
  if (user.status === 'suspended' || user.status === 'terminated') {
    throw createError({
      statusCode: 403,
      message: 'Ваш аккаунт заблокирован'
    })
  }

  // Получаем подписки с тарифами
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

  // Определяем основной тариф (интернет)
  const internetSub = subscriptions?.find(s => s.services?.type === 'internet')
  const tariffName = internetSub?.services?.name || 'Не подключен'

  // Создаём сессию с httpOnly cookie
  await createUserSession(event, user.id, account.id, 'contract', String(account.contract_number), {
    login: body.login
  })

  // Возвращаем данные для клиента
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
      balance: account.balance, // в копейках
      status: account.status,
      tariff: tariffName,
      address: account.address_full || '',
      startDate: account.start_date
    }
  }
})
