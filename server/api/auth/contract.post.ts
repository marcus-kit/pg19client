interface ContractAuthData {
  contractNumber: string
  lastName: string
  firstName: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ContractAuthData>(event)

  // Проверяем наличие обязательных полей
  if (!body.contractNumber || !body.lastName || !body.firstName) {
    throw createError({
      statusCode: 400,
      message: 'Заполните все поля'
    })
  }

  // Используем shared Supabase client
  const supabase = useSupabaseServer()

  // Ищем контракт по номеру договора
  const { data: contract, error: contractError } = await supabase
    .from('contracts_view')
    .select(`
      id,
      user_id,
      contract_number,
      balance,
      status,
      address_full,
      start_date
    `)
    .eq('contract_number', parseInt(body.contractNumber))
    .single()

  if (contractError || !contract) {
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
    .eq('id', contract.user_id)
    .single()

  if (userError || !user) {
    throw createError({
      statusCode: 404,
      message: 'Пользователь не найден'
    })
  }

  // Проверяем ФИ (регистронезависимо)
  const lastNameMatch = user.last_name?.toLowerCase() === body.lastName.toLowerCase()
  const firstNameMatch = user.first_name?.toLowerCase() === body.firstName.toLowerCase()

  if (!lastNameMatch || !firstNameMatch) {
    throw createError({
      statusCode: 401,
      message: 'Неверные данные. Проверьте фамилию и имя.'
    })
  }

  // Проверяем статус пользователя
  if (user.status === 'suspended' || user.status === 'terminated') {
    throw createError({
      statusCode: 403,
      message: 'Ваш аккаунт заблокирован'
    })
  }

  // Получаем подписки с тарифами
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

  // Определяем основной тариф (интернет)
  const internetSub = subscriptions?.find((s: any) => s.service_type === 'internet')
  const tariffName = internetSub?.service_name || 'Не подключен'

  // Создаём сессию с httpOnly cookie
  await createUserSession(event, user.id, contract.id, 'contract', body.contractNumber, {
    last_name: body.lastName,
    first_name: body.firstName
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
      contractNumber: contract.contract_number,
      balance: contract.balance, // в копейках
      status: contract.status,
      tariff: tariffName,
      address: contract.address_full || '',
      startDate: contract.start_date
    }
  }
})
