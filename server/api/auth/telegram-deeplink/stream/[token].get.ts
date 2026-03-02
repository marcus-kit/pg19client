/**
 * SSE-эндпоинт для отслеживания статуса TelegramAuthRequest.
 * Использует event.node.res напрямую — надёжнее ReadableStream в Nitro.
 *
 * Опрашивает БД каждые 1.5 сек, отправляет событие при изменении статуса.
 * Закрывает соединение при статусе 'verified', 'expired', 'used' или по таймауту 5 мин.
 */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token || token.length !== 32) {
    throw createError({ statusCode: 400, message: 'Неверный токен' })
  }

  const { res } = event.node

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  })

  const prisma = usePrisma()
  const deadline = Date.now() + 5 * 60 * 1000
  let timer: ReturnType<typeof setTimeout> | null = null

  function send(data: object): void {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }
  }

  function heartbeat(): void {
    if (!res.writableEnded) {
      res.write(': ping\n\n')
    }
  }

  async function tick(): Promise<void> {
    if (res.writableEnded) return

    if (Date.now() > deadline) {
      send({ status: 'expired' })
      res.end()
      return
    }

    try {
      const req = await prisma.telegramAuthRequest.findUnique({
        where: { token },
        select: { status: true, expires_at: true }
      })

      if (!req) {
        send({ status: 'expired' })
        res.end()
        return
      }

      if (req.status !== 'pending') {
        send({ status: req.status })
        res.end()
        return
      }

      if (req.expires_at && new Date(req.expires_at) < new Date()) {
        await prisma.telegramAuthRequest.update({
          where: { token },
          data: { status: 'expired' }
        })
        send({ status: 'expired' })
        res.end()
        return
      }
    } catch {
      // При ошибке БД — продолжаем опрос
    }

    heartbeat()
    timer = setTimeout(() => tick(), 1500)
  }

  // Очищаем таймер при закрытии соединения клиентом
  res.on('close', () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  })

  await tick()

  // Держим соединение открытым до закрытия клиентом или res.end()
  return new Promise<void>((resolve) => {
    res.on('close', resolve)
    res.on('finish', resolve)
  })
})
