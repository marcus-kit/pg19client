/**
 * Telegram OIDC — callback после авторизации
 * Обменивает code на tokens, валидирует id_token, создаёт сессию
 */
import { getCookie, deleteCookie } from 'h3'
import * as jose from 'jose'
import { createUserSession } from '../../../utils/userAuth'

const PKCE_COOKIE_NAME = 'tg_oidc_pkce'
const JWKS_URL = 'https://oauth.telegram.org/.well-known/jwks.json'

interface IdTokenPayload {
  iss: string
  aud: string
  sub: string
  iat: number
  exp: number
  id?: number
  name?: string
  preferred_username?: string
  picture?: string
  phone_number?: string
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string
  const state = query.state as string
  const errorParam = query.error as string

  if (errorParam) {
    deleteCookie(event, PKCE_COOKIE_NAME, { path: '/' })
    return sendRedirect(event, `/login?error=${encodeURIComponent('Авторизация отменена')}`)
  }

  if (!code || !state) {
    return sendRedirect(event, '/login?error=' + encodeURIComponent('Неверные параметры callback'))
  }

  const pkceCookie = getCookie(event, PKCE_COOKIE_NAME)
  deleteCookie(event, PKCE_COOKIE_NAME, { path: '/' })

  if (!pkceCookie) {
    return sendRedirect(event, '/login?error=' + encodeURIComponent('Сессия истекла. Попробуйте снова'))
  }

  let pkceData: { codeVerifier: string; state: string }
  try {
    pkceData = JSON.parse(pkceCookie)
  } catch {
    return sendRedirect(event, '/login?error=' + encodeURIComponent('Неверные данные сессии'))
  }

  if (pkceData.state !== state) {
    return sendRedirect(event, '/login?error=' + encodeURIComponent('Неверный state. Возможная CSRF атака'))
  }

  const config = useRuntimeConfig()
  const clientId = config.telegramOidcClientId as string
  const clientSecret = config.telegramOidcClientSecret as string
  const siteUrl = (config.public.siteUrl as string) || 'https://master-dev.doka.team'

  if (!clientId || !clientSecret) {
    return sendRedirect(event, '/login?error=' + encodeURIComponent('OIDC не настроен'))
  }

  const redirectUri = `${siteUrl.replace(/\/$/, '')}/api/auth/telegram/callback`

  const tokenResponse = await $fetch<{ id_token?: string; access_token?: string; error?: string }>(
    'https://oauth.telegram.org/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: pkceData.codeVerifier
      }).toString()
    }
  ).catch((e: any) => {
    console.error('[OIDC] Token exchange failed:', e?.data || e?.message || e)
    return null
  })

  if (!tokenResponse?.id_token) {
    const errMsg = tokenResponse?.error || 'Не удалось получить токен'
    return sendRedirect(event, `/login?error=${encodeURIComponent(errMsg)}`)
  }

  const jwks = jose.createRemoteJWKSet(new URL(JWKS_URL))
  let payload: IdTokenPayload
  try {
    const { payload: p } = await jose.jwtVerify(tokenResponse.id_token, jwks, {
      issuer: 'https://oauth.telegram.org',
      audience: clientId
    })
    payload = p as unknown as IdTokenPayload
  } catch (e) {
    console.error('[OIDC] JWT verification failed:', e)
    return sendRedirect(event, '/login?error=' + encodeURIComponent('Неверный токен авторизации'))
  }

  const telegramId = String(payload.sub)
  const telegramUsername = payload.preferred_username ?? null

  const prisma = usePrisma()

  const user = await prisma.user.findFirst({
    where: { telegram_id: telegramId },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      middle_name: true,
      phone: true,
      email: true,
      telegram_username: true,
      telegram_id: true,
      birth_date: true,
      avatar: true,
      vk_id: true,
      status: true
    }
  })

  if (!user) {
    return sendRedirect(
      event,
      '/login?error=' + encodeURIComponent('Telegram не привязан к аккаунту. Войдите по договору и привяжите Telegram в профиле.')
    )
  }

  if (user.status === 'suspended' || user.status === 'terminated') {
    return sendRedirect(event, '/login?error=' + encodeURIComponent('Ваш аккаунт заблокирован'))
  }

  const account = await prisma.account.findFirst({
    where: { user_id: user.id },
    select: {
      id: true,
      contract_id: true,
      contract_number: true,
      balance: true,
      status: true,
      address_full: true,
      start_date: true
    }
  })

  let tariffName = 'Не подключен'
  let payDay = 20
  let isBlocked = false

  if (account?.contract_id) {
    const contract = await prisma.contract.findUnique({
      where: { id: account.contract_id },
      select: { pay_day: true, is_blocked: true }
    })
    if (contract) {
      payDay = contract.pay_day ?? 20
      isBlocked = contract.is_blocked ?? false
    }
    const services = await prisma.contractService.findMany({
      where: { contract_id: account.contract_id, is_active: true },
      select: { name: true, type: true }
    })
    const internetService = services.find((s) => s.type === 'internet')
    tariffName = internetService?.name ?? services[0]?.name ?? tariffName
  }

  if (telegramUsername && telegramUsername !== user.telegram_username) {
    await prisma.user.update({
      where: { id: user.id },
      data: { telegram_username: telegramUsername, updated_at: new Date() }
    })
  }

  await createUserSession(event, user.id, account?.id ?? null, 'telegram', telegramId, {
    telegram_username: telegramUsername,
    auth_method: 'oidc'
  })

  return sendRedirect(event, '/dashboard')
})
