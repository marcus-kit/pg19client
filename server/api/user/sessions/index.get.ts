import type { LoginSession } from '~/types/session'
import { getSessionToken } from '../../../utils/userAuth'

export default defineEventHandler(async (event): Promise<LoginSession[]> => {
  const sessionUser = await requireUser(event)
  const currentToken = getSessionToken(event)

  const prisma = usePrisma()
  const sessions = await prisma.authSession.findMany({
    where: {
      user_id: sessionUser.id,
      verified: true,
      expires_at: { gt: new Date() }
    },
    select: {
      id: true,
      session_token: true,
      method: true,
      identifier: true,
      expires_at: true,
      created_at: true,
      metadata: true
    },
    orderBy: { created_at: 'desc' }
  })

  const list: LoginSession[] = sessions.map((s) => {
    const meta = (s.metadata as Record<string, unknown>) || {}
    const device = (meta.device as string) || (meta.user_agent as string) || '—'
    const browser = (meta.browser as string) || (meta.user_agent as string) || '—'
    const ip = (meta.ip as string) || (meta.ip_address as string) || '—'
    const location = (meta.location as string) || '—'

    return {
      id: s.id,
      device,
      browser,
      ip,
      location,
      lastActive: (s.expires_at ?? s.created_at).toISOString(),
      current: currentToken ? s.session_token === currentToken : false
    }
  })

  return list
})
