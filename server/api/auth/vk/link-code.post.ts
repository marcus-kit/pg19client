import crypto from 'crypto'
import { requireUser } from '../../../server/utils/userAuth'

export default defineEventHandler(async (event) => {
  const sessionUser = await requireUser(event)
  const prisma = usePrisma()

  const now = new Date()

  // Если VK уже привязан, не даём создать новый код
  const existingUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { vk_id: true }
  })

  if (!existingUser) {
    throw createError({ statusCode: 404, message: 'Пользователь не найден' })
  }

  if (existingUser.vk_id) {
    throw createError({
      statusCode: 400,
      message: 'VK уже привязан к этому аккаунту'
    })
  }

  // Пытаемся переиспользовать актуальный pending-запрос
  const activeRequest = await prisma.vkLinkRequest.findFirst({
    where: {
      user_id: sessionUser.id,
      status: 'pending',
      expires_at: {
        gt: now
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  })

  if (activeRequest) {
    return {
      code: activeRequest.code,
      expiresAt: activeRequest.expires_at.toISOString(),
      expiresInSeconds: Math.max(
        0,
        Math.floor((activeRequest.expires_at.getTime() - now.getTime()) / 1000)
      )
    }
  }

  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000) // 30 минут

  // Генерация человеко-читаемого и уникального кода
  async function generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const raw = crypto.randomBytes(4).toString('hex').toUpperCase()
      const code = `PG19-${raw}`

      const exists = await prisma.vkLinkRequest.findUnique({
        where: { code }
      })

      if (!exists) return code
    }

    throw createError({
      statusCode: 500,
      message: 'Не удалось сгенерировать уникальный код. Попробуйте позже.'
    })
  }

  const code = await generateUniqueCode()

  await prisma.vkLinkRequest.create({
    data: {
      user_id: sessionUser.id,
      code,
      status: 'pending',
      expires_at: expiresAt
    }
  })

  return {
    code,
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds: Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
  }
}
)

