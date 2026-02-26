export default defineEventHandler(async (event) => {
  const sessionUser = await requireUser(event)
  const sessionId = getRouterParam(event, 'sessionId')

  if (!sessionId) {
    throw createError({
      statusCode: 400,
      message: 'sessionId обязателен'
    })
  }

  const currentJti = await getSessionJti(event)
  const isCurrentSession = currentJti === sessionId

  const prisma = usePrisma()
  const deleted = await prisma.authSession.deleteMany({
    where: {
      id: sessionId,
      user_id: sessionUser.id
    }
  })

  if (deleted.count === 0) {
    throw createError({
      statusCode: 404,
      message: 'Сессия не найдена'
    })
  }

  if (isCurrentSession) {
    clearSessionCookie(event)
  }

  return { success: true, currentSessionTerminated: isCurrentSession }
})
