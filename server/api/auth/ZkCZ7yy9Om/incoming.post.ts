function extractPhoneFromBody(body: Record<string, unknown> | null | undefined): string | null {
  if (!body) return null
  const candidates = [
    body.phone,
    body.from,
    body.caller_id,
    body.caller,
    (body.data && typeof body.data === 'object') ? (body.data as Record<string, unknown>).from : undefined,
    (body.data && typeof body.data === 'object') ? (body.data as Record<string, unknown>).phone : undefined
  ]
  for (const v of candidates) {
    if (typeof v === 'string' && v.trim()) return v
  }
  return null
}

/**
 * POST /api/auth/ZkCZ7yy9Om/incoming
 * Публичный endpoint для телефонии: принимает номер телефона звонящего
 * и помечает соответствующий запрос верификации как подтверждённый.
 *
 * Не требует секрета — телефония не может передавать заголовки авторизации.
 * Всегда возвращает { ok: true } независимо от результата (не раскрывает детали).
 *
 * Поддерживаемые форматы тела (JSON и form-urlencoded):
 * - { "phone": "79001234567" }
 * - { "from": "79001234567" }  — типично для телефонии
 * - { "caller_id": "79001234567" }
 * - { "data": { "from": "79001234567" } } — вложенная структура
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event).catch((err) => {
    console.warn('[CallVerify Incoming] Body parse error:', err?.message || err)
    return {}
  })
  const rawPhone = extractPhoneFromBody(body)

  if (!rawPhone) {
    console.log('[CallVerify Incoming] No phone in body, keys:', Object.keys(body || {}))
    return { ok: true }
  }

  const normalizedPhone = String(rawPhone).replace(/\D/g, '').replace(/^8/, '7').trim()
  if (!/^7\d{10}$/.test(normalizedPhone)) {
    console.log('[CallVerify Incoming] Invalid phone format:', { raw: rawPhone, normalized: normalizedPhone })
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
    console.log('[CallVerify Incoming] Verified:', { phone: normalizedPhone, token: request.token })
  } else {
    console.log('[CallVerify Incoming] No pending request for phone:', normalizedPhone)
  }

  return { ok: true }
})
