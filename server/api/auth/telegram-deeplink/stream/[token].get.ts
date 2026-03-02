/**
 * SSE-эндпоинт для отслеживания статуса TelegramAuthRequest.
 * Заменяет HTTP-polling: держит постоянное соединение и отправляет
 * событие, как только статус в БД изменяется с 'pending'.
 *
 * Поддерживает heartbeat-комментарии каждые 20 сек для поддержания соединения.
 * Закрывает соединение при статусе 'verified', 'expired', 'used' или по таймауту 5 мин.
 */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token || token.length !== 32) {
    throw createError({ statusCode: 400, message: 'Неверный токен' })
  }

  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  })

  const prisma = usePrisma()
  const deadline = Date.now() + 5 * 60 * 1000
  const encoder = new TextEncoder()

  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      function send(data: object): void {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          closed = true
        }
      }

      function heartbeat(): void {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          closed = true
        }
      }

      async function tick(): Promise<void> {
        if (closed) return

        // Истёк общий таймаут
        if (Date.now() > deadline) {
          send({ status: 'expired' })
          closed = true
          controller.close()
          return
        }

        try {
          const req = await prisma.telegramAuthRequest.findUnique({
            where: { token },
            select: { status: true, expires_at: true }
          })

          if (!req) {
            send({ status: 'expired' })
            closed = true
            controller.close()
            return
          }

          // Статус изменился — отправляем и закрываем
          if (req.status !== 'pending') {
            send({ status: req.status })
            closed = true
            controller.close()
            return
          }

          // Истёк срок токена в БД
          if (req.expires_at && new Date(req.expires_at) < new Date()) {
            await prisma.telegramAuthRequest.update({
              where: { token },
              data: { status: 'expired' }
            })
            send({ status: 'expired' })
            closed = true
            controller.close()
            return
          }
        } catch {
          // При ошибке БД — продолжаем опрос
        }

        heartbeat()
        // Опрашиваем каждые 1.5 секунды
        setTimeout(() => tick(), 1500)
      }

      // Запускаем первый опрос
      tick()

      // Heartbeat каждые 20 сек для поддержания соединения через прокси/nginx
      const heartbeatTimer = setInterval(() => {
        if (closed) {
          clearInterval(heartbeatTimer)
          return
        }
        heartbeat()
      }, 20000)
    }
  })

  return stream
})
