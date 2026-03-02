/**
 * Telegram OIDC — инициация авторизации (Authorization Code + PKCE)
 * Редирект на oauth.telegram.org/auth
 * purpose=link — привязка в профиле (требует сессию)
 */
import crypto from 'crypto'
import { setCookie } from 'h3'
import { getUserFromSession } from '../../../utils/userAuth'

const PKCE_COOKIE_NAME = 'tg_oidc_pkce'
const PKCE_COOKIE_MAX_AGE = 600

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function generateCodeVerifier(): string {
  return base64UrlEncode(crypto.randomBytes(32))
}

function generateCodeChallenge(verifier: string): string {
  return base64UrlEncode(crypto.createHash('sha256').update(verifier).digest())
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const purpose = (query.purpose as string) || 'login'

  let sessionUserId: string | undefined
  if (purpose === 'link') {
    const sessionUser = await getUserFromSession(event)
    if (!sessionUser) {
      return sendRedirect(event, '/login?error=' + encodeURIComponent('Войдите в личный кабинет и повторите привязку'))
    }
    sessionUserId = sessionUser.id
  }

  const config = useRuntimeConfig()
  const clientId = config.telegramOidcClientId as string
  const siteUrl = (config.public.siteUrl as string) || 'https://master-dev.doka.team'

  if (!clientId) {
    throw createError({
      statusCode: 500,
      message: 'Telegram OIDC не настроен. Добавьте TELEGRAM_OIDC_CLIENT_ID в .env'
    })
  }

  const redirectUri = `${siteUrl.replace(/\/$/, '')}/api/auth/telegram/callback`
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = base64UrlEncode(crypto.randomBytes(16))

  const cookieData: { codeVerifier: string; state: string; purpose?: string; userId?: string } = {
    codeVerifier,
    state
  }
  if (purpose === 'link' && sessionUserId) {
    cookieData.purpose = 'link'
    cookieData.userId = sessionUserId
  }

  setCookie(event, PKCE_COOKIE_NAME, JSON.stringify(cookieData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: PKCE_COOKIE_MAX_AGE,
    path: '/'
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  })

  const authUrl = `https://oauth.telegram.org/auth?${params.toString()}`
  return sendRedirect(event, authUrl)
})
