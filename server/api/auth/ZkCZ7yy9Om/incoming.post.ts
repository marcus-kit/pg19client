/**
 * POST /api/auth/call-verify/incoming
 * Публичный endpoint для телефонии: принимает номер телефона звонящего
 * и помечает соответствующий запрос верификации как подтверждённый.
 *
 * Не требует секрета — телефония не может передавать заголовки авторизации.
 * Всегда возвращает { ok: true } независимо от результата (не раскрывает детали).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ phone?: string }>(event).catch(() => ({}))
  const rawPhone = body?.phone

  if (!rawPhone || typeof rawPhone !== 'string') {
    return { ok: true }
  }

  const normalizedPhone = String(rawPhone).replace(/\D/g, '').replace(/^8/, '7').trim()
  if (!/^7\d{10}$/.test(normalizedPhone)) {
    return { ok: true }
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

  if (request) {
    await prisma.phoneVerificationRequest.update({
      where: { id: request.id },
      data: { status: 'verified' }
    })
    if (process.dev) {
      console.log('[CallVerify Incoming] Verified:', { phone: normalizedPhone, token: request.token })
    }
  }

  return { ok: true }
})
