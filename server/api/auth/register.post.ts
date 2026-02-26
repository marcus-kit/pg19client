/**
 * POST /api/auth/register
 * Регистрация нового пользователя (без договора).
 */
import { randomUUID } from 'crypto'

interface RegisterBody {
  lastName: string
  firstName: string
  middleName: string
  email?: string
  phone: string
}

function normalizePhone(phone: string): string {
  const digits = String(phone).replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('7')) return digits
  if (digits.length === 10) return '7' + digits
  return digits
}

export default defineEventHandler(async (event) => {
  const body = await readBody<RegisterBody>(event)

  if (!body.lastName?.trim() || !body.firstName?.trim() || !body.phone?.trim()) {
    throw createError({ statusCode: 400, message: 'Заполните фамилию, имя и телефон' })
  }

  const phoneNormalized = normalizePhone(body.phone)
  if (phoneNormalized.length !== 11 || !phoneNormalized.startsWith('7')) {
    throw createError({ statusCode: 400, message: 'Введите корректный номер телефона (11 цифр, начинается с 7)' })
  }

  const prisma = usePrisma()
  const existing = await prisma.user.findFirst({
    where: { phone: phoneNormalized },
    select: { id: true, status: true }
  })

  if (existing) {
    if (existing.status === 'suspended' || existing.status === 'terminated') {
      throw createError({ statusCode: 403, message: 'Аккаунт с этим телефоном заблокирован' })
    }
    throw createError({
      statusCode: 409,
      message: 'Пользователь с таким телефоном уже зарегистрирован. Войдите по номеру договора.'
    })
  }

  const userId = randomUUID()
  const now = new Date()
  const fullName = [body.lastName, body.firstName, body.middleName].filter(Boolean).join(' ').trim()

  await prisma.user.create({
    data: {
      id: userId,
      first_name: body.firstName.trim(),
      last_name: body.lastName.trim(),
      middle_name: (body.middleName ?? '').trim(),
      full_name: fullName || `${body.lastName} ${body.firstName}`.trim(),
      email: (body.email ?? '').trim() || null,
      phone: phoneNormalized,
      telegram_id: null,
      telegram_username: null,
      birth_date: null,
      avatar: null,
      vk_id: '',
      status: 'active',
      created_at: now,
      updated_at: now
    }
  })

  await createUserSession(event, userId, null, 'register', phoneNormalized, {
    last_name: body.lastName.trim(),
    first_name: body.firstName.trim()
  })

  return {
    success: true,
    user: {
      id: userId,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      middleName: (body.middleName ?? '').trim(),
      phone: phoneNormalized,
      email: (body.email ?? '').trim(),
      telegram: '',
      telegramId: null,
      vkId: '',
      avatar: null,
      birthDate: null,
      role: 'user' as const
    },
    account: null
  }
})
