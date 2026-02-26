import { H3Event, getCookie, setCookie, deleteCookie, createError, getHeader } from 'h3'
import crypto from 'crypto'
import * as jose from 'jose'

const SESSION_COOKIE_NAME = 'pg19_session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 дней в секундах

export interface SessionUser {
  id: string
  accountId: string | null
}

interface JwtPayload {
  sub: string
  accountId?: string | null
  jti: string
  exp: number
  iat: number
}

function getJwtSecret(): Uint8Array {
  const config = useRuntimeConfig()
  const secret = config.jwtSecret as string
  if (!secret || secret.length < 32) {
    throw createError({
      statusCode: 500,
      message: 'JWT_SECRET не настроен или слишком короткий'
    })
  }
  return new TextEncoder().encode(secret)
}

/**
 * Получает токен сессии из cookie или заголовка Authorization: Bearer
 */
export function getSessionToken(event: H3Event): string | undefined {
  const fromCookie = getCookie(event, SESSION_COOKIE_NAME)
  if (fromCookie) return fromCookie
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }
  return undefined
}

/**
 * Устанавливает cookie сессии (значение — JWT строка)
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
 * Проверяет, что строка похожа на JWT (три base64 части через точку).
 * Старые cookie с hex-токеном не являются JWT.
 */
function looksLikeJwt(token: string): boolean {
  const parts = token.split('.')
  return parts.length === 3 && parts.every(p => /^[A-Za-z0-9_-]+$/.test(p))
}

/**
 * Получает пользователя из сессии (JWT).
 * Проверяет подпись и exp, опционально — наличие сессии по jti в БД (для отзыва).
 */
export async function getUserFromSession(event: H3Event): Promise<SessionUser | null> {
  const token = getSessionToken(event)
  if (!token || !looksLikeJwt(token)) return null

  try {
    const secret = getJwtSecret()
    const { payload } = await jose.jwtVerify(token, secret)
    const { sub, accountId, jti } = payload as unknown as JwtPayload
    if (!sub || !jti) return null

    const prisma = usePrisma()
    const session = await prisma.authSession.findFirst({
      where: { id: jti, verified: true, expires_at: { gt: new Date() } },
      select: { user_id: true }
    })
    if (!session) return null

    return {
      id: sub,
      accountId: accountId ?? null
    }
  } catch {
    return null
  }
}

/**
 * Возвращает jti (id сессии) из текущего JWT запроса, если токен валиден.
 * Используется для определения «текущей» сессии в списке.
 */
export async function getSessionJti(event: H3Event): Promise<string | undefined> {
  const token = getSessionToken(event)
  if (!token || !looksLikeJwt(token)) return undefined
  try {
    const secret = getJwtSecret()
    const { payload } = await jose.jwtVerify(token, secret)
    return (payload as unknown as JwtPayload).jti
  } catch {
    return undefined
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
 * Создаёт новую сессию: запись в auth_sessions и JWT в cookie.
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
  const sessionId = crypto.randomUUID()
  const sessionExpiry = new Date()
  sessionExpiry.setSeconds(sessionExpiry.getSeconds() + SESSION_MAX_AGE)

  await prisma.authSession.create({
    data: {
      id: sessionId,
      session_token: sessionId,
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

  const secret = getJwtSecret()
  const jwt = await new jose.SignJWT({ accountId: accountId ?? null })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(sessionExpiry.getTime() / 1000))
    .sign(secret)

  setSessionCookie(event, jwt)
  return jwt
}

/**
 * Обновляет JWT в cookie с новым accountId (тот же jti).
 * Используется при восстановлении/смене аккаунта в account/current.
 */
export async function refreshSessionAccount(
  event: H3Event,
  userId: string,
  accountId: string | null,
  jti: string
): Promise<void> {
  const prisma = usePrisma()
  const session = await prisma.authSession.findFirst({
    where: { id: jti, user_id: userId },
    select: { expires_at: true }
  })
  if (!session) return

  const expiresAt = session.expires_at
  const exp = expiresAt ? Math.floor(new Date(expiresAt).getTime() / 1000) : Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
  const secret = getJwtSecret()
  const jwt = await new jose.SignJWT({ accountId: accountId ?? null })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secret)

  setSessionCookie(event, jwt)
}

/**
 * Завершает текущую сессию: инвалидация по jti в БД и очистка cookie.
 */
export async function endUserSession(event: H3Event): Promise<void> {
  const token = getSessionToken(event)
  if (token && looksLikeJwt(token)) {
    try {
      const { payload } = await jose.jwtDecode(token) as { jti?: string }
      if (payload?.jti) {
        const prisma = usePrisma()
        await prisma.authSession.updateMany({
          where: { id: payload.jti },
          data: { expires_at: new Date() }
        })
      }
    } catch {
      // ignore decode errors
    }
  }
  clearSessionCookie(event)
}
