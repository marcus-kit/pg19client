import crypto from 'crypto'

interface CallVerifyRequest {
  phone: string
}

export default defineEventHandler(async (event) => {
  requireRateLimit(event, RATE_LIMIT_CONFIGS.callVerify)

  const body = await readBody<CallVerifyRequest>(event)
  if (!body.phone) {
    throw createError({ statusCode: 400, message: 'Укажите номер телефона' })
  }

  const normalizedPhone = String(body.phone).replace(/\D/g, '').replace(/^8/, '7').trim()
  if (!/^7\d{10}$/.test(normalizedPhone)) {
    throw createError({ statusCode: 400, message: 'Неверный формат номера телефона' })
  }

  const prisma = usePrisma()
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ phone: normalizedPhone }, { phone: `+${normalizedPhone}` }]
    },
    select: { id: true, status: true }
  })

  if (!user) {
    if (process.dev) console.log('[CallVerify] No user for phone:', normalizedPhone)
    throw createError({ statusCode: 404, message: 'Пользователь с таким номером не найден' })
  }
  if (user.status === 'suspended' || user.status === 'terminated') {
    throw createError({ statusCode: 403, message: 'Ваш аккаунт заблокирован' })
  }

  const account = await prisma.account.findFirst({
    where: { user_id: user.id },
    select: { id: true }
  })

  await prisma.phoneVerificationRequest.updateMany({
    where: { phone: normalizedPhone, status: 'pending' },
    data: { status: 'expired' }
  })

  const token = crypto.randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000)

  await prisma.phoneVerificationRequest.create({
    data: {
      id: crypto.randomUUID(),
      token,
      phone: normalizedPhone,
      code: '',
      user_id: user.id,
      account_id: account?.id ?? null,
      status: 'pending',
      expires_at: expiresAt
    }
  })

  const config = useRuntimeConfig()
  return {
    success: true,
    token,
    callNumber: config.public.beelineCallNumber || '+7 960 459-69-45',
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds: 180
  }
})
