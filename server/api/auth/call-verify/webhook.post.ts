/**
 * POST /api/auth/call-verify/webhook
 * Телефония при входящем звонке вызывает этот endpoint.
 * Помечает запрос как verified; фронт узнаёт через polling.
 */
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  }

  const config = useRuntimeConfig()
  const secret = config.callVerifyWebhookSecret
  const headerSecret = getHeader(event, 'x-call-verify-secret') || getHeader(event, 'X-Call-Verify-Secret')
  if (!secret || headerSecret !== secret) {
    throw createError({ statusCode: 401, message: 'Invalid authentication credentials' })
  }

  const body = await readBody<{ phone?: string }>(event).catch(() => ({}))
  const rawPhone = body?.phone
  if (!rawPhone || typeof rawPhone !== 'string') {
    throw createError({ statusCode: 400, message: 'Body must contain phone (string)' })
  }

  const normalizedPhone = String(rawPhone).replace(/\D/g, '').replace(/^8/, '7').trim()
  if (!/^7\d{10}$/.test(normalizedPhone)) {
    throw createError({ statusCode: 400, message: 'Invalid phone format' })
  }

  const prisma = usePrisma()
  const request = await prisma.phoneVerificationRequest.findFirst({
    where: {
      phone: normalizedPhone,
      status: 'pending',
      expires_at: { gt: new Date() }
    },
    orderBy: { created_at: 'desc' },
    select: { id: true, token: true }
  })

  if (!request) {
    return { ok: true, verified: false, message: 'No pending request for this phone' }
  }

  await prisma.phoneVerificationRequest.update({
    where: { id: request.id },
    data: { status: 'verified' }
  })

  console.log('[CallVerify Webhook] Verified:', { phone: normalizedPhone, token: request.token })
  return { ok: true, verified: true }
})
