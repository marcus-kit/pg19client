/**
 * SSE-эндпоинт для отслеживания статуса TelegramAuthRequest.
 * Использует createEventStream из H3 — канонический метод для Nuxt/Nitro.
 *
 * Опрашивает БД каждые 1.5 сек, отправляет событие при изменении статуса.
 * Закрывает соединение при статусе 'verified', 'expired', 'used' или по таймауту 5 мин.
 */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token || token.length !== 32) {
    throw createError({ statusCode: 400, message: 'Неверный токен' })
  }

  const prisma = usePrisma()
  const deadline = Date.now() + 5 * 60 * 1000

  const eventStream = createEventStream(event)
  let timer: ReturnType<typeof setTimeout> | null = null
  let active = true

  async function tick(): Promise<void> {
    if (!active) return

    if (Date.now() > deadline) {
      await eventStream.push(JSON.stringify({ status: 'expired' }))
      active = false
      await eventStream.close()
      return
    }

    try {
      const req = await prisma.telegramAuthRequest.findUnique({
        where: { token },
        select: { status: true, expires_at: true }
      })

      if (!req) {
        await eventStream.push(JSON.stringify({ status: 'expired' }))
        active = false
        await eventStream.close()
        return
      }

      // Статус изменился — отправляем и закрываем
      if (req.status !== 'pending') {
        await eventStream.push(JSON.stringify({ status: req.status }))
        active = false
        await eventStream.close()
        return
      }

      // Истёк срок токена в БД
      if (req.expires_at && new Date(req.expires_at) < new Date()) {
        await prisma.telegramAuthRequest.update({
          where: { token },
          data: { status: 'expired' }
        })
        await eventStream.push(JSON.stringify({ status: 'expired' }))
        active = false
        await eventStream.close()
        return
      }
    } catch (e) {
      console.error('[SSE] DB error:', e)
      // При ошибке БД — продолжаем опрос
    }

    timer = setTimeout(() => tick(), 1500)
  }

  eventStream.onClosed(() => {
    active = false
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  })

  // Запускаем первый опрос
  tick()

  return eventStream.send()
})
