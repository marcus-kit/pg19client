// PATCH /api/user/profile/nickname — обновить никнейм (глобально уникальный)

import type { UpdateNicknameRequest, UpdateNicknameResponse } from '~/types/community'

export default defineEventHandler(async (event): Promise<UpdateNicknameResponse> => {
  const body = await readBody<UpdateNicknameRequest>(event)
  const prisma = usePrisma()

  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) {
    throw createError({ statusCode: 401, message: 'Требуется авторизация' })
  }

  const nickname = body.nickname?.trim() || null

  if (nickname !== null) {
    if (nickname.length < 2 || nickname.length > 30) {
      throw createError({ statusCode: 400, message: 'Никнейм должен быть от 2 до 30 символов' })
    }
    if (!/^[\p{L}\p{N}\s_-]+$/u.test(nickname)) {
      throw createError({ statusCode: 400, message: 'Никнейм содержит недопустимые символы' })
    }

    const existing = await prisma.user.findFirst({
      where: {
        nickname,
        id: { not: sessionUser.id }
      }
    })
    if (existing) {
      throw createError({ statusCode: 409, message: 'Этот никнейм уже занят' })
    }
  }

  try {
    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        nickname,
        updated_at: new Date()
      },
      select: { nickname: true }
    })
    return { success: true, nickname: updated.nickname }
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code === 'P2002') {
      throw createError({ statusCode: 409, message: 'Этот никнейм уже занят' })
    }
    console.error('Error updating nickname:', e)
    throw createError({ statusCode: 500, message: 'Ошибка обновления никнейма' })
  }
})
