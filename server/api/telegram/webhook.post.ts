/**
 * POST /api/telegram/webhook
 * Обработчик webhook от Telegram бота
 *
 * Обрабатывает команды /start AUTH_xxxxx для deeplink-авторизации
 * Верифицирует подпись через X-Telegram-Bot-Api-Secret-Token
 */

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
  chat: {
    id: number
    type: string
  }
  date: number
  text?: string
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Верификация секрета webhook
  const secretToken = getHeader(event, 'x-telegram-bot-api-secret-token')
  if (!config.telegramWebhookSecret || secretToken !== config.telegramWebhookSecret) {
    console.warn('[TelegramWebhook] Invalid secret token')
    // Возвращаем 200 чтобы Telegram не ретраил (но ничего не делаем)
    return { ok: true }
  }

  const body = await readBody<TelegramUpdate>(event)

  // Проверяем что это сообщение с текстом
  if (!body.message?.text || !body.message.from) {
    return { ok: true }
  }

  const { text, from, chat } = body.message

  // Обрабатываем только команду /start с параметром AUTH_
  const match = text.match(/^\/start\s+AUTH_([a-zA-Z0-9]+)$/)
  if (!match) {
    // Можно отправить приветственное сообщение для обычного /start
    if (text === '/start') {
      await sendTelegramMessage(
        chat.id,
        'Добро пожаловать! Этот бот используется для авторизации в личном кабинете ПЖ19.\n\n' +
        'Перейдите на сайт pg19v3client.doka.team и нажмите "Войти через Telegram".',
        config.telegramBotToken
      )
    }
    return { ok: true }
  }

  const token = match[1]
  console.log('[TelegramWebhook] Auth request:', { token, telegramId: from.id, username: from.username })

  const supabase = useSupabaseServer()

  // Ищем запрос авторизации по токену
  const { data: authRequest, error: findError } = await supabase
    .from('telegram_auth_requests')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (findError || !authRequest) {
    console.log('[TelegramWebhook] Token not found or not pending:', token)
    await sendTelegramMessage(
      chat.id,
      'Ссылка для авторизации недействительна или уже использована.\n\n' +
      'Вернитесь на сайт и запросите новую ссылку.',
      config.telegramBotToken
    )
    return { ok: true }
  }

  // Проверяем что токен не истёк
  if (new Date(authRequest.expires_at) < new Date()) {
    await supabase
      .from('telegram_auth_requests')
      .update({ status: 'expired' })
      .eq('id', authRequest.id)

    await sendTelegramMessage(
      chat.id,
      'Время для авторизации истекло.\n\n' +
      'Вернитесь на сайт и запросите новую ссылку.',
      config.telegramBotToken
    )
    return { ok: true }
  }

  // Для login flow: проверяем что telegram_id привязан к какому-то пользователю
  if (authRequest.purpose === 'login') {
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, first_name, status')
      .eq('telegram_id', from.id.toString())
      .single()

    if (userError || !existingUser) {
      await sendTelegramMessage(
        chat.id,
        'Ваш Telegram не привязан к аккаунту ПЖ19.\n\n' +
        'Войдите по номеру договора на сайте и привяжите Telegram в профиле.',
        config.telegramBotToken
      )
      return { ok: true }
    }

    if (existingUser.status === 'suspended' || existingUser.status === 'terminated') {
      await sendTelegramMessage(
        chat.id,
        'Ваш аккаунт заблокирован. Обратитесь в поддержку.',
        config.telegramBotToken
      )
      return { ok: true }
    }
  }

  // Для link flow: проверяем что telegram_id не занят другим пользователем
  if (authRequest.purpose === 'link') {
    const { data: occupiedUser } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', from.id.toString())
      .single()

    if (occupiedUser && occupiedUser.id !== authRequest.user_id) {
      await sendTelegramMessage(
        chat.id,
        'Этот Telegram уже привязан к другому аккаунту.\n\n' +
        'Если вы хотите привязать его к новому аккаунту, сначала отвяжите его от старого.',
        config.telegramBotToken
      )
      return { ok: true }
    }
  }

  // Обновляем запрос авторизации
  const { error: updateError } = await supabase
    .from('telegram_auth_requests')
    .update({
      status: 'verified',
      telegram_id: from.id,
      telegram_username: from.username || null,
      telegram_first_name: from.first_name,
      telegram_last_name: from.last_name || null,
      verified_at: new Date().toISOString()
    })
    .eq('id', authRequest.id)

  if (updateError) {
    console.error('[TelegramWebhook] Update error:', updateError)
    await sendTelegramMessage(
      chat.id,
      'Произошла ошибка. Попробуйте ещё раз.',
      config.telegramBotToken
    )
    return { ok: true }
  }

  // Отправляем broadcast через Supabase Realtime
  const channel = supabase.channel(`telegram-auth:${token}`)
  await channel.send({
    type: 'broadcast',
    event: 'verified',
    payload: {
      telegramId: from.id,
      telegramUsername: from.username
    }
  })

  // Отправляем подтверждение пользователю
  const successMessage = authRequest.purpose === 'login'
    ? 'Авторизация подтверждена! Вернитесь в браузер.'
    : 'Telegram успешно привязан! Вернитесь в браузер.'

  await sendTelegramMessage(chat.id, successMessage, config.telegramBotToken)

  console.log('[TelegramWebhook] Auth verified:', { token, telegramId: from.id })

  return { ok: true }
})

/**
 * Отправка сообщения через Telegram Bot API
 */
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
