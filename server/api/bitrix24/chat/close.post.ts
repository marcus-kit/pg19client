/**
 * Закрытие сессии чата Bitrix24
 * ⚠️ Webhook URL используется только на сервере!
 */

export default defineEventHandler(async (event) => {
  const body = await readBody<{ sessionId: string }>(event)
  const config = useRuntimeConfig()

  // ⚠️ Webhook URL доступен только на сервере!
  const BITRIX24_WEBHOOK = config.bitrix24WebhookUrl || ''

  if (!body.sessionId) {
    throw createError({
      statusCode: 400,
      message: 'sessionId обязателен'
    })
  }

  try {
    // Если есть webhook URL, закрываем через Bitrix24 API
    if (BITRIX24_WEBHOOK) {
      try {
        await $fetch(`${BITRIX24_WEBHOOK}/imopenlines.session.update`, {
          method: 'POST',
          body: {
            SESSION_ID: body.sessionId,
            ACTION: 'CLOSE'
          }
        })
      } catch (apiError: any) {
        console.error('Bitrix24 API error:', apiError)
        // Продолжаем даже при ошибке
      }
    }

    return { success: true }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Ошибка при закрытии сессии'
    })
  }
})
