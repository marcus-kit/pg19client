import crypto from 'crypto'
import { getClientIdentifier } from '../../../utils/rateLimit'
import { getUserFromSession } from '../../../utils/userAuth'

interface DeeplinkRequest {
  purpose: 'login' | 'link'
  userId?: string
}

export default defineEventHandler(async (event) => {
  requireRateLimit(event, RATE_LIMIT_CONFIGS.telegramDeeplink)

  const body = await readBody<DeeplinkRequest>(event)
  const config = useRuntimeConfig()

  if (!body.purpose || !['login', 'link'].includes(body.purpose)) {
    throw createError({
      statusCode: 400,
      message: 'Укажите purpose: login или link'
    })
  }

  if (body.purpose === 'link') {
    if (!body.userId) {
      throw createError({
        statusCode: 400,
        message: 'Для привязки Telegram укажите userId'
      })
    }
    const sessionUser = await getUserFromSession(event)
    if (!sessionUser) {
      throw createError({
        statusCode: 401,
        message: 'Требуется авторизация. Войдите в личный кабинет и повторите попытку.'
      })
    }
    if (sessionUser.id !== body.userId) {
      throw createError({
        statusCode: 403,
        message: 'Нельзя привязать Telegram к чужому аккаунту'
      })
    }
  }

  const prisma = usePrisma()

  if (body.purpose === 'link') {
    const user = await prisma.user.findUnique({
      where: { id: body.userId! },
      select: { id: true, telegram_id: true }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'Пользователь не найден'
      })
    }
  }

  const clientId = getClientIdentifier(event)

  if (body.purpose === 'login') {
    await prisma.telegramAuthRequest.updateMany({
      where: {
        ip_address: clientId,
        purpose: 'login',
        status: 'pending'
      },
      data: { status: 'expired' }
    })
  } else {
    await prisma.telegramAuthRequest.updateMany({
      where: {
        user_id: body.userId!,
        purpose: 'link',
        status: 'pending'
      },
      data: { status: 'expired' }
    })
  }

  const token = crypto.randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

  await prisma.telegramAuthRequest.create({
    data: {
      token,
      purpose: body.purpose,
      user_id: body.userId ?? null,
      account_id: null,
      ip_address: clientId,
      user_agent: getHeader(event, 'user-agent') ?? null,
      status: 'pending',
      expires_at: expiresAt
    }
  })

  const botUsername = config.public.telegramBotUsername || 'PG19CONNECTBOT'
  const deeplink = `https://t.me/${botUsername}?start=AUTH_${token}`

  return {
    success: true,
    token,
    deeplink,
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds: 300
  }
})
