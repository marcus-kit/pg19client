interface UpdateUserData {
  data: {
    firstName?: string
    lastName?: string
    middleName?: string
    birthDate?: string | null
    phone?: string
    email?: string
    vkId?: string
    avatar?: string | null
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<UpdateUserData>(event)
  const sessionUser = await getUserFromSession(event)

  if (!sessionUser) {
    throw createError({ statusCode: 401, message: 'Требуется авторизация' })
  }

  const userId = sessionUser.id

  const dbData: Record<string, unknown> = {}

  if (body.data?.firstName !== undefined) dbData.first_name = body.data.firstName
  if (body.data?.lastName !== undefined) dbData.last_name = body.data.lastName
  if (body.data?.middleName !== undefined) dbData.middle_name = body.data.middleName
  if (body.data?.birthDate !== undefined) dbData.birth_date = body.data.birthDate ? new Date(body.data.birthDate) : null
  if (body.data?.phone !== undefined) dbData.phone = body.data.phone
  if (body.data?.email !== undefined) dbData.email = body.data.email
  if (body.data?.vkId !== undefined) dbData.vk_id = body.data.vkId
  if (body.data?.avatar !== undefined) dbData.avatar = body.data.avatar

  if (body.data?.firstName !== undefined || body.data?.lastName !== undefined || body.data?.middleName !== undefined) {
    const current = await usePrisma().user.findUnique({
      where: { id: userId },
      select: { first_name: true, last_name: true, middle_name: true }
    })
    if (current) {
      const firstName = body.data?.firstName ?? current.first_name
      const lastName = body.data?.lastName ?? current.last_name
      const middleName = body.data?.middleName ?? current.middle_name
      dbData.full_name = [lastName, firstName, middleName].filter(Boolean).join(' ')
    }
  }

  if (Object.keys(dbData).length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Нет данных для обновления'
    })
  }

  dbData.updated_at = new Date()

  const updated = await usePrisma().user.update({
    where: { id: userId },
    data: dbData as never,
    select: {
      id: true,
      first_name: true,
      last_name: true,
      middle_name: true,
      full_name: true,
      email: true,
      phone: true,
      telegram_id: true,
      telegram_username: true,
      birth_date: true,
      avatar: true,
      vk_id: true
    }
  })

  return {
    success: true,
    user: {
      id: updated.id,
      firstName: updated.first_name ?? undefined,
      lastName: updated.last_name ?? undefined,
      middleName: updated.middle_name ?? undefined,
      phone: updated.phone ?? '',
      email: updated.email ?? '',
      telegram: updated.telegram_username ? `@${updated.telegram_username}` : '',
      telegramId: updated.telegram_id ?? null,
      vkId: updated.vk_id ?? '',
      avatar: updated.avatar ?? null,
      birthDate: updated.birth_date ?? null
    }
  }
})
