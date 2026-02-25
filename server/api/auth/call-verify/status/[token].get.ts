/**
 * GET /api/auth/call-verify/status/[token]
 * Проверка статуса верификации (polling)
 */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, message: 'Token required' })

  const prisma = usePrisma()
  const request = await prisma.phoneVerificationRequest.findUnique({
    where: { token },
    select: { status: true }
  })
  if (!request) throw createError({ statusCode: 404, message: 'Token not found' })
  return { status: request.status }
})
