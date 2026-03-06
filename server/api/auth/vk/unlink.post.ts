import { requireUser } from '../../../utils/userAuth'

export default defineEventHandler(async (event) => {
  const sessionUser = await requireUser(event)
  const prisma = usePrisma()

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, vk_id: true }
  })

  if (!user) {
    throw createError({ statusCode: 404, message: 'Пользователь не найден' })
  }

  if (!user.vk_id) {
    // Нечего отвязывать — просто возвращаем текущие данные
    return { success: true }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      vk_id: null
    }
  })

  return {
    success: true
  }
})

