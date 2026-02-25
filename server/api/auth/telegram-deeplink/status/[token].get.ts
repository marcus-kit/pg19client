export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token || token.length !== 32) {
    throw createError({
      statusCode: 400,
      message: 'Неверный токен'
    })
  }

  const prisma = usePrisma()

  const authRequest = await prisma.telegramAuthRequest.findUnique({
    where: { token },
    select: { status: true, expires_at: true }
  })

  if (!authRequest) {
    throw createError({
      statusCode: 404,
      message: 'Запрос не найден'
    })
  }

  if (authRequest.status === 'pending' && authRequest.expires_at && new Date(authRequest.expires_at) < new Date()) {
    await prisma.telegramAuthRequest.update({
      where: { token },
      data: { status: 'expired' }
    })
    return { status: 'expired' }
  }

  return { status: authRequest.status }
})
