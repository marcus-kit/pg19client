import { getClientIdentifier, resetRateLimit } from '../../../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token || token.length !== 32) {
    throw createError({
      statusCode: 400,
      message: 'Неверный токен'
    })
  }

  const prisma = usePrisma()

  const authRequest = await prisma.telegramAuthRequest.findFirst({
    where: { token, status: 'verified' }
  })

  if (!authRequest) {
    throw createError({
      statusCode: 404,
      message: 'Запрос не найден или не подтверждён'
    })
  }

  await prisma.telegramAuthRequest.update({
    where: { id: authRequest.id },
    data: { status: 'used' }
  })

  if (authRequest.purpose === 'link') {
    return await handleLinkFlow(event, prisma, authRequest)
  }
  return await handleLoginFlow(event, prisma, authRequest)
})

async function handleLoginFlow(
  event: ReturnType<typeof defineEventHandler>,
  prisma: ReturnType<typeof usePrisma>,
  authRequest: { telegram_id: bigint | null; telegram_username: string | null }
) {
  const telegramId = authRequest.telegram_id?.toString()
  if (!telegramId) {
    throw createError({
      statusCode: 400,
      message: 'Telegram не привязан к запросу'
    })
  }

  const user = await prisma.user.findFirst({
    where: { telegram_id: telegramId },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      middle_name: true,
      phone: true,
      email: true,
      telegram_username: true,
      telegram_id: true,
      birth_date: true,
      avatar: true,
      vk_id: true,
      status: true
    }
  })

  if (!user) {
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

  const account = await prisma.account.findFirst({
    where: { user_id: user.id },
    select: {
      id: true,
      contract_id: true,
      contract_number: true,
      balance: true,
      status: true,
      address_full: true,
      start_date: true
    }
  })

  let tariffName = 'Не подключен'
  if (account?.contract_id) {
    const services = await prisma.contractService.findMany({
      where: { contract_id: account.contract_id, is_active: true },
      select: { name: true, type: true }
    })
    const internetService = services.find((s) => s.type === 'internet')
    tariffName = internetService?.name ?? services[0]?.name ?? tariffName
  }

  if (authRequest.telegram_username && authRequest.telegram_username !== user.telegram_username) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        telegram_username: authRequest.telegram_username,
        updated_at: new Date()
      }
    })
  }

  await createUserSession(
    event,
    user.id,
    account?.id ?? null,
    'telegram',
    telegramId,
    {
      telegram_username: authRequest.telegram_username,
      auth_method: 'deeplink'
    }
  )

  resetRateLimit(getClientIdentifier(event), 'auth:telegram-deeplink')

  return {
    success: true,
    user: {
      id: user.id,
      firstName: user.first_name ?? undefined,
      lastName: user.last_name ?? undefined,
      middleName: user.middle_name ?? undefined,
      phone: user.phone ?? '',
      email: user.email ?? '',
      telegram: authRequest.telegram_username ? `@${authRequest.telegram_username}` : '',
      telegramId,
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
}

async function handleLinkFlow(
  event: ReturnType<typeof defineEventHandler>,
  prisma: ReturnType<typeof usePrisma>,
  authRequest: { user_id: string | null; telegram_id: bigint | null; telegram_username: string | null }
) {
  const telegramId = authRequest.telegram_id?.toString()
  const userId = authRequest.user_id

  if (!userId || !telegramId) {
    throw createError({
      statusCode: 400,
      message: 'Неверные данные запроса'
    })
  }

  const existingUser = await prisma.user.findFirst({
    where: { telegram_id: telegramId },
    select: { id: true }
  })

  if (existingUser && existingUser.id !== userId) {
    throw createError({
      statusCode: 409,
      message: 'Этот Telegram уже привязан к другому аккаунту'
    })
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      telegram_id: telegramId,
      telegram_username: authRequest.telegram_username ?? null,
      updated_at: new Date()
    }
  })

  resetRateLimit(getClientIdentifier(event), 'auth:telegram-deeplink')

  return {
    success: true,
    telegramId,
    telegramUsername: authRequest.telegram_username ?? null
  }
}
