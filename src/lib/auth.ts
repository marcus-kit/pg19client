import { cookies } from 'next/headers'
import crypto from 'crypto'
import { getSupabaseServer } from './supabase-server'

const SESSION_COOKIE_NAME = 'pg19_session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 дней

export interface SessionUser {
  id: string
  accountId: string
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function setSessionCookie(token: string): Promise<void> {
  const c = await cookies()
  c.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const c = await cookies()
  c.delete(SESSION_COOKIE_NAME)
}

export async function getSessionToken(): Promise<string | undefined> {
  const c = await cookies()
  return c.get(SESSION_COOKIE_NAME)?.value
}

export async function getUserFromSession(): Promise<SessionUser | null> {
  const token = await getSessionToken()
  if (!token) return null

  const supabase = getSupabaseServer()
  const { data: session, error } = await supabase
    .from('auth_sessions')
    .select('user_id, account_id, expires_at')
    .eq('session_token', token)
    .eq('verified', true)
    .single()

  if (error || !session) return null
  if (new Date(session.expires_at) < new Date()) return null

  return { id: session.user_id, accountId: session.account_id }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getUserFromSession()
  if (!user) {
    throw new Response(JSON.stringify({ message: 'Требуется авторизация' }), {
      status: 401,
    })
  }
  return user
}

export async function createUserSession(
  userId: string,
  accountId: string,
  method: 'telegram' | 'contract' | 'phone',
  identifier: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  const supabase = getSupabaseServer()
  const token = generateSessionToken()
  const sessionExpiry = new Date()
  sessionExpiry.setSeconds(sessionExpiry.getSeconds() + SESSION_MAX_AGE)

  const { error } = await supabase.from('auth_sessions').insert({
    session_token: token,
    method,
    identifier,
    verified: true,
    user_id: userId,
    account_id: accountId,
    verified_at: new Date().toISOString(),
    expires_at: sessionExpiry.toISOString(),
    metadata: metadata || {},
  })

  if (error) {
    console.error('Failed to create session:', error)
    throw new Response(JSON.stringify({ message: 'Ошибка создания сессии' }), {
      status: 500,
    })
  }

  await setSessionCookie(token)
  return token
}

export async function endUserSession(): Promise<void> {
  const token = await getSessionToken()
  if (token) {
    const supabase = getSupabaseServer()
    await supabase
      .from('auth_sessions')
      .update({ expires_at: new Date().toISOString() })
      .eq('session_token', token)
  }
  await clearSessionCookie()
}
