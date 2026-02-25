import { H3Event, getCookie, setCookie, deleteCookie, createError } from 'h3'
import crypto from 'crypto'

const SESSION_COOKIE_NAME = 'pg19_session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 дней в секундах

interface SessionUser {
  id: string
  accountId: string | null
}

/**
 * Генерирует криптографически безопасный токен сессии
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Устанавливает cookie сессии
 */
export function setSessionCookie(event: H3Event, token: string): void {
  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE,
    path: '/'
  })
}

/**
 * Удаляет cookie сессии
 */
export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE_NAME, {
    path: '/'
  })
}

/**
 * Получает токен сессии из cookie
 */
export function getSessionToken(event: H3Event): string | undefined {
  return getCookie(event, SESSION_COOKIE_NAME)
}

/**
 * Получает пользователя из сессии.
 * Возвращает null если сессия не валидна или истекла.
 */
export async function getUserFromSession(event: H3Event): Promise<SessionUser | null> {
  const token = getSessionToken(event)
  if (!token) return null

  const prisma = usePrisma()
  const session = await prisma.authSession.findFirst({
    where: { session_token: token, verified: true },
    select: { user_id: true, account_id: true, expires_at: true }
  })

  if (!session) return null
  if (session.expires_at && new Date(session.expires_at) < new Date()) return null

  return {
    id: session.user_id,
    accountId: session.account_id
  }
}

/**
 * Требует авторизованного пользователя.
 */
export async function requireUser(event: H3Event): Promise<SessionUser> {
  const user = await getUserFromSession(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Требуется авторизация' })
  }
  return user
}

/**
 * Создаёт новую сессию для пользователя
 */
export async function createUserSession(
  event: H3Event,
  userId: string,
  accountId: string | null,
  method: 'telegram' | 'contract' | 'phone' | 'register',
  identifier: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  const prisma = usePrisma()
  const token = generateSessionToken()
  const sessionExpiry = new Date()
  sessionExpiry.setSeconds(sessionExpiry.getSeconds() + SESSION_MAX_AGE)
  const sessionId = crypto.randomUUID()

  await prisma.authSession.create({
    data: {
      id: sessionId,
      session_token: token,
      user_id: userId,
      account_id: accountId,
      method,
      identifier,
      verified: true,
      verified_at: new Date(),
      expires_at: sessionExpiry,
      metadata: (metadata || {}) as object
    }
  })

  setSessionCookie(event, token)
  return token
}

/**
 * Завершает текущую сессию пользователя
 */
export async function endUserSession(event: H3Event): Promise<void> {
  const token = getSessionToken(event)
  if (token) {
    const prisma = usePrisma()
    await prisma.authSession.updateMany({
      where: { session_token: token },
      data: { expires_at: new Date() }
    })
  }
  clearSessionCookie(event)
}
