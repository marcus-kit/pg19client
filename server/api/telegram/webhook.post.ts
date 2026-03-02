import { getTelegramBotToken } from '../../utils/config'

interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

interface TelegramMessage {
  message_id: number
  from: TelegramUser
  chat: { id: number; type: string }
  date: number
  text?: string
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const botToken = getTelegramBotToken()

  const secretToken = getHeader(event, 'x-telegram-bot-api-secret-token')
  if (!config.telegramWebhookSecret || secretToken !== config.telegramWebhookSecret) {
    return { ok: true }
  }

  const body = await readBody<TelegramUpdate>(event)

  if (!body.message?.text || !body.message.from) {
    return { ok: true }
  }

  const { text, from, chat } = body.message

  const match = text.match(/^\/start\s+AUTH_([a-zA-Z0-9]+)$/)
  if (!match) {
    if (text === '/start') {
      await sendTelegramMessage(
        chat.id,
        'Добро пожаловать! Этот бот используется для авторизации в личном кабинете ПЖ19.\n\n' +
          'Перейдите на сайт pg19v3client.doka.team и нажмите "Войти через Telegram".',
        botToken
      )
    }
    return { ok: true }
  }

  const token = match[1]
  const prisma = usePrisma()

  const authRequest = await prisma.telegramAuthRequest.findFirst({
    where: { token, status: 'pending' }
  })

  if (!authRequest) {
    await sendTelegramMessage(
      chat.id,
      'Ссылка для авторизации недействительна или уже использована.\n\n' +
        'Вернитесь на сайт и запросите новую ссылку.',
      botToken
    )
    return { ok: true }
  }

  if (authRequest.expires_at && new Date(authRequest.expires_at) < new Date()) {
    await prisma.telegramAuthRequest.update({
      where: { id: authRequest.id },
      data: { status: 'expired' }
    })
    await sendTelegramMessage(
      chat.id,
      'Время для авторизации истекло.\n\n' +
        'Вернитесь на сайт и запросите новую ссылку.',
      botToken
    )
    return { ok: true }
  }

  if (authRequest.purpose === 'login') {
    const existingUser = await prisma.user.findFirst({
      where: { telegram_id: from.id.toString() },
      select: { id: true, first_name: true, status: true }
    })

    if (!existingUser) {
      await sendTelegramMessage(
        chat.id,
        'Ваш Telegram не привязан к аккаунту ПЖ19.\n\n' +
          'Войдите по номеру договора на сайте и привяжите Telegram в профиле.',
        botToken
      )
      return { ok: true }
    }

    if (existingUser.status === 'suspended' || existingUser.status === 'terminated') {
      await sendTelegramMessage(
        chat.id,
        'Ваш аккаунт заблокирован. Обратитесь в поддержку.',
        botToken
      )
      return { ok: true }
    }
  }

  if (authRequest.purpose === 'link') {
    const occupiedUser = await prisma.user.findFirst({
      where: { telegram_id: from.id.toString() },
      select: { id: true }
    })

    if (occupiedUser && occupiedUser.id !== authRequest.user_id) {
      await sendTelegramMessage(
        chat.id,
        'Этот Telegram уже привязан к другому аккаунту.\n\n' +
          'Если вы хотите привязать его к новому аккаунту, сначала отвяжите его от старого.',
        botToken
      )
      return { ok: true }
    }
  }

  await prisma.telegramAuthRequest.update({
    where: { id: authRequest.id },
    data: {
      status: 'verified',
      telegram_id: BigInt(from.id),
      telegram_username: from.username ?? null
    }
  })

  const successMessage =
    authRequest.purpose === 'login'
      ? '✅ Авторизация подтверждена!\n\nНажмите кнопку ниже, чтобы перейти в личный кабинет.'
      : '✅ Telegram успешно привязан!\n\nНажмите кнопку ниже, чтобы вернуться в профиль.'

  const { public: { siteUrl } } = useRuntimeConfig()
  const buttonUrl =
    authRequest.purpose === 'login'
      ? `${siteUrl}/dashboard`
      : `${siteUrl}/profile`

  const buttonText =
    authRequest.purpose === 'login' ? '🏠 Открыть личный кабинет' : '👤 Вернуться в профиль'

  await sendTelegramMessageWithButton(chat.id, successMessage, buttonText, buttonUrl, botToken)

  return { ok: true }
})

async function sendTelegramMessage(chatId: number, text: string, botToken: string): Promise<void> {
  try {
    await $fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      body: {
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      }
    })
  } catch (e) {
    console.error('[TelegramWebhook] Failed to send message:', e)
  }
}

async function sendTelegramMessageWithButton(
  chatId: number,
  text: string,
  buttonText: string,
  buttonUrl: string,
  botToken: string
): Promise<void> {
  try {
    await $fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      body: {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: buttonText, url: buttonUrl }]]
        }
      }
    })
  } catch (e) {
    console.error('[TelegramWebhook] Failed to send message with button:', e)
  }
}
