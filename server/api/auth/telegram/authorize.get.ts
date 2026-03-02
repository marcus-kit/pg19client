/**
 * Telegram OIDC — инициация авторизации (Authorization Code + PKCE)
 * Редирект на oauth.telegram.org/auth
 */
import crypto from 'crypto'
import { setCookie } from 'h3'

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

  setCookie(event, PKCE_COOKIE_NAME, JSON.stringify({ codeVerifier, state }), {
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
