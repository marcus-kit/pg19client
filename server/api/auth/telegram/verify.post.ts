import crypto from 'crypto'
import { getClientIdentifier, resetRateLimit, requireRateLimit, RATE_LIMIT_CONFIGS } from '../../../utils/rateLimit'

interface TelegramWidgetData {
  id: string | number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: string | number
  hash: string
}

export default defineEventHandler(async (event) => {
  requireRateLimit(event, RATE_LIMIT_CONFIGS.telegramDeeplink)

  const config = useRuntimeConfig()
  const botToken = config.telegramBotToken as string

  if (!botToken) {
    throw createError({
      statusCode: 500,
      message: 'Telegram бот не настроен'
    })
  }

  const body = await readBody<TelegramWidgetData>(event)

  if (!body?.id || !body?.auth_date || !body?.hash) {
    throw createError({
      statusCode: 400,
      message: 'Неверные данные авторизации'
    })
  }

  // Верификация подписи Telegram
  const { hash, ...fields } = body
  const dataCheckString = Object.keys(fields)
    .filter(k => fields[k as keyof typeof fields] !== undefined && fields[k as keyof typeof fields] !== null)
    .sort()
    .map(k => `${k}=${fields[k as keyof typeof fields]}`)
    .join('\n')

  const secretKey = crypto.createHash('sha256').update(botToken).digest()
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  if (expectedHash !== hash) {
    throw createError({
      statusCode: 403,
      message: 'Неверная подпись Telegram. Попробуйте снова.'
    })
  }

  // Проверка свежести auth_date (не старше 24 часов)
  const authDate = Number(fields.auth_date)
  if (Date.now() / 1000 - authDate > 86400) {
    throw createError({
      statusCode: 401,
      message: 'Данные авторизации устарели. Войдите заново.'
    })
  }

  const telegramId = String(fields.id)
  const telegramUsername = fields.username ?? null

  const prisma = usePrisma()

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
      message: 'Telegram не привязан к аккаунту. Войдите по договору и привяжите Telegram в профиле.'
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
  let payDay = 20
  let isBlocked = false

  if (account?.contract_id) {
    const contract = await prisma.contract.findUnique({
      where: { id: account.contract_id },
      select: { pay_day: true, is_blocked: true }
    })
    if (contract) {
      payDay = contract.pay_day ?? 20
      isBlocked = contract.is_blocked ?? false
    }
    const services = await prisma.contractService.findMany({
      where: { contract_id: account.contract_id, is_active: true },
      select: { name: true, type: true }
    })
    const internetService = services.find((s) => s.type === 'internet')
    tariffName = internetService?.name ?? services[0]?.name ?? tariffName
  }

  // Обновить username если изменился
  if (telegramUsername && telegramUsername !== user.telegram_username) {
    await prisma.user.update({
      where: { id: user.id },
      data: { telegram_username: telegramUsername, updated_at: new Date() }
    })
  }

  await createUserSession(event, user.id, account?.id ?? null, 'telegram', telegramId, {
    telegram_username: telegramUsername,
    auth_method: 'widget'
  })

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
      telegram: telegramUsername ? `@${telegramUsername}` : '',
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
          status: isBlocked ? 'blocked' : 'active',
          tariff: tariffName,
          address: account.address_full ?? '',
          startDate: account.start_date,
          payDay
        }
      : null
  }
})
