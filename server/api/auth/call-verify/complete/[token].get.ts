/**
 * GET /api/auth/call-verify/complete/[token]
 * Завершение авторизации по звонку: сессия + данные пользователя
 */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, message: 'Token обязателен' })

  const prisma = usePrisma()
  const request = await prisma.phoneVerificationRequest.findFirst({
    where: { token, status: 'verified' }
  })
  if (!request) {
    throw createError({ statusCode: 404, message: 'Запрос не найден или не подтверждён' })
  }

  const user = await prisma.user.findUnique({
    where: { id: request.user_id },
    select: { id: true, first_name: true, last_name: true, middle_name: true, phone: true, email: true, telegram_username: true, telegram_id: true, birth_date: true, avatar: true, vk_id: true }
  })
  if (!user) throw createError({ statusCode: 500, message: 'Ошибка загрузки данных пользователя' })

  let account: { id: string; contract_id: string | null; contract_number: string; balance: unknown; status: string; address_full: string | null; start_date: Date | null } | null = null
  if (request.account_id) {
    account = await prisma.account.findUnique({
      where: { id: request.account_id },
      select: { id: true, contract_id: true, contract_number: true, balance: true, status: true, address_full: true, start_date: true }
    })
  }

  let tariffName = 'Не подключен'
  if (account?.contract_id) {
    const services = await prisma.contractService.findMany({
      where: { contract_id: account.contract_id, is_active: true },
      select: { name: true, type: true }
    })
    const internet = services.find(s => s.type === 'internet')
    tariffName = internet?.name ?? services[0]?.name ?? tariffName
  }

  await createUserSession(event, user.id, account?.id ?? null, 'phone', request.phone)
  const clientIp = getClientIdentifier(event)
  resetRateLimit(clientIp, 'auth:call-verify')

  return {
    success: true,
    user: {
      id: user.id,
      firstName: user.first_name ?? '',
      lastName: user.last_name ?? '',
      middleName: user.middle_name ?? '',
      phone: user.phone ?? '',
      email: user.email ?? '',
      telegram: user.telegram_username ? `@${user.telegram_username}` : '',
      telegramId: user.telegram_id ?? null,
      vkId: user.vk_id ?? '',
      avatar: user.avatar ?? null,
      birthDate: user.birth_date ?? null,
      role: 'user'
    },
    account: account
      ? {
          contractNumber: account.contract_number,
          balance: Number(account.balance),
          status: account.status,
          tariff: tariffName,
          address: account.address_full ?? '',
          startDate: account.start_date
        }
      : null
  }
})
