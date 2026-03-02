/**
 * GET /api/user/me — текущий пользователь (для обновления store после привязки Telegram и т.д.)
 */
export default defineEventHandler(async (event) => {
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) throw createError({ statusCode: 401, message: 'Требуется авторизация' })

  const user = await usePrisma().user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      middle_name: true,
      phone: true,
      email: true,
      telegram_username: true,
      telegram_id: true,
      birth_date: true,
      avatar: true,
      vk_id: true
    }
  })

  if (!user) throw createError({ statusCode: 404, message: 'Пользователь не найден' })

  return {
    id: user.id,
    firstName: user.first_name ?? undefined,
    lastName: user.last_name ?? undefined,
    middleName: user.middle_name ?? undefined,
    phone: user.phone ?? '',
    email: user.email ?? '',
    telegram: user.telegram_username ? `@${user.telegram_username}` : '',
    telegramId: user.telegram_id ?? null,
    birthDate: user.birth_date ?? null,
    avatar: user.avatar ?? null,
    vkId: user.vk_id ?? '',
    role: 'user'
  }
})
