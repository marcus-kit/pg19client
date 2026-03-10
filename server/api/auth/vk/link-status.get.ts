/**
 * GET /api/auth/vk/link-status?code=PG19-XXXX
 * Проверяет статус запроса привязки VK по коду.
 */
import { requireUser } from '../../../utils/userAuth'

export default defineEventHandler(async (event) => {
  const sessionUser = await requireUser(event)
  const query = getQuery(event)
  const code = (query.code as string || '').trim().toUpperCase()

  if (!code) {
    throw createError({ statusCode: 400, message: 'Параметр code обязателен' })
  }

  const prisma = usePrisma()

  const linkRequest = await prisma.vkLinkRequest.findFirst({
    where: {
      code,
      user_id: sessionUser.id
    },
    select: {
      status: true,
      expires_at: true
    }
  })

  if (!linkRequest) {
    return { status: 'not_found' }
  }

  return {
    status: linkRequest.status,
    expired: linkRequest.expires_at < new Date()
  }
})
