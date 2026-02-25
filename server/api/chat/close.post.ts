interface CloseRequest {
  chatId: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CloseRequest>(event)

  if (!body.chatId) {
    throw createError({
      statusCode: 400,
      message: 'chatId обязателен'
    })
  }

  const prisma = usePrisma()

  const chat = await prisma.chat.findUnique({
    where: { id: body.chatId },
    select: { id: true, status: true }
  })

  if (!chat) {
    throw createError({
      statusCode: 404,
      message: 'Чат не найден'
    })
  }

  if (chat.status === 'closed') {
    return { success: true, message: 'Чат уже закрыт' }
  }

  await prisma.chat.update({
    where: { id: body.chatId },
    data: {
      status: 'closed',
      closed_at: new Date()
    }
  })

  return { success: true, message: 'Чат закрыт' }
})
