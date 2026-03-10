interface VkMessage {
  date: number
  from_id: number
  id: number
  out: number
  peer_id: number
  text: string
  conversation_message_id: number
  // остальные поля нам не критичны
}

interface VkUpdate {
  type: string
  group_id: number
  secret?: string
  object?: {
    message?: VkMessage
    // для других типов может быть другая структура
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const vkSecret = config.vkWebhookSecret as string | undefined
  const confirmationCode = config.vkConfirmationCode as string | undefined
  const groupToken = config.vkGroupToken as string | undefined
  const siteUrl = config.public.siteUrl as string

  const body = await readBody<VkUpdate>(event)

  console.log('[VK Callback] Получен запрос', {
    type: body.type,
    groupId: body.group_id,
    hasSecret: !!body.secret
  })

  // Подтверждение сервера ВК
  if (body.type === 'confirmation') {
    if (!confirmationCode) {
      console.error('[VK Callback] VK_CONFIRMATION_CODE не настроен')
      throw createError({
        statusCode: 500,
        message: 'VK confirmation code not configured'
      })
    }
    // ВК ожидает просто строку с кодом
    console.log('[VK Callback] Отправляю confirmationCode')
    return confirmationCode
  }

  // Проверка секрета (если настроен)
  if (vkSecret && body.secret !== vkSecret) {
    console.warn('[VK Callback] Отклонён: неверный secret', {
      received: body.secret
    })
    return 'ok'
  }

  if (body.type !== 'message_new' || !body.object?.message) {
    console.log('[VK Callback] Неподдерживаемый тип события или нет message', {
      type: body.type
    })
    return 'ok'
  }

  const message = body.object.message
  const text = (message.text || '').trim()
  const vkUserId = message.from_id

  console.log('[VK Callback] Новое сообщение', {
    fromId: vkUserId,
    peerId: message.peer_id,
    text
  })

  const prisma = usePrisma()

  // Ограничим частоту по одному VK user_id
  // (простой in-memory limiter можно добавить позже при необходимости)

  // Ищем код вида PG19-XXXX...
  const codeMatch = text.match(/PG19-[A-Z0-9]+/i)
  if (!codeMatch) {
    console.log('[VK Callback] Сообщение не содержит кода PG19-XXXX', { text })
    // Можно отправить подсказку, но не обязательно
    return 'ok'
  }

  const code = codeMatch[0].toUpperCase()
  const now = new Date()

  console.log('[VK Callback] Найден код привязки', { code })

  const linkRequest = await prisma.vkLinkRequest.findFirst({
    where: {
      code,
      status: 'pending',
      expires_at: {
        gt: now
      }
    }
  })

  if (!linkRequest) {
    console.warn('[VK Callback] Запрос привязки по коду не найден или истёк', {
      code
    })
    if (groupToken) {
      await sendVkMessage(
        message.peer_id,
        '⏱ Код недействителен или срок его действия истёк.\n\n' +
          'Сгенерируйте новый код привязки в личном кабинете и отправьте его сюда.',
        groupToken
      )
    }
    return 'ok'
  }

  // Уникальность VK: один VK-аккаунт не может быть привязан к разным пользователям.
  // Перепривязка на том же пользователе (смена vk_id на другой) разрешена — обновление ниже перезапишет User.vk_id.
  const existingUserWithVk = await prisma.user.findFirst({
    where: {
      vk_id: vkUserId.toString()
    },
    select: { id: true }
  })

  if (existingUserWithVk && existingUserWithVk.id !== linkRequest.user_id) {
    console.warn('[VK Callback] VK уже привязан к другому пользователю', {
      vkUserId,
      existingUserId: existingUserWithVk.id,
      requestedUserId: linkRequest.user_id
    })
    if (groupToken) {
      await sendVkMessage(
        message.peer_id,
        '⚠️ Этот аккаунт VK уже привязан к другому профилю.\n\n' +
          'Если вы хотите привязать его к новому аккаунту, сначала отвяжите VK в старом профиле.',
        groupToken
      )
    }
    return 'ok'
  }

  // Обновляем пользователя и запрос
  await prisma.$transaction([
    prisma.user.update({
      where: { id: linkRequest.user_id },
      data: {
        vk_id: vkUserId.toString()
      }
    }),
    prisma.vkLinkRequest.update({
      where: { id: linkRequest.id },
      data: {
        status: 'completed',
        vk_user_id: BigInt(vkUserId)
      }
    })
  ])

  console.log('[VK Callback] Привязка VK успешно завершена', {
    vkUserId,
    userId: linkRequest.user_id,
    code
  })

  if (groupToken) {
    await sendVkMessage(
      message.peer_id,
      '✅ Ваш аккаунт VK успешно привязан к профилю.\n\n' +
        `Теперь вы увидите отметку привязки в разделе контактов профиля.\n\n` +
        `Перейти в личный кабинет: ${siteUrl}/profile`,
      groupToken
    )
  }

  return 'ok'
})

async function sendVkMessage(peerId: number, text: string, groupToken: string): Promise<void> {
  try {
    const randomId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    await $fetch('https://api.vk.com/method/messages.send', {
      method: 'POST',
      query: {
        v: '5.199',
        peer_id: peerId,
        random_id: randomId,
        message: text,
        access_token: groupToken
      }
    })
  } catch (e) {
    console.error('[VK Callback] Failed to send message:', e)
  }
}

