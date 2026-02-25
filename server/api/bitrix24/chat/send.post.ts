/**
 * Отправка сообщения в чат Bitrix24 Open Lines
 * ⚠️ Webhook URL используется только на сервере!
 */
import type { Bitrix24ChatMessage, Bitrix24Attachment } from '~/types/bitrix24'

interface SendRequest {
  sessionId: string
  text: string
  attachment?: Bitrix24Attachment
  hash?: string  // livechat_auth_id для виджета API
  chatId?: string  // CHAT_ID для виджета API
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SendRequest>(event)
  const config = useRuntimeConfig()

  const BITRIX24_WEBHOOK = config.bitrix24WebhookUrl || ''

  console.log('[Bitrix24 Send] Request:', {
    sessionId: body.sessionId,
    textLength: body.text?.length,
    hasAttachment: !!body.attachment,
    hasWebhook: !!BITRIX24_WEBHOOK,
    webhookUrl: BITRIX24_WEBHOOK ? BITRIX24_WEBHOOK.substring(0, 50) + '...' : 'not set',
    hasHash: !!body.hash,
    hasChatId: !!body.chatId
  })

  if (!body.sessionId || !body.text.trim()) {
    throw createError({
      statusCode: 400,
      message: 'sessionId и text обязательны'
    })
  }

  // Проверяем, что это реальный SESSION_ID от Bitrix24, а не локальный fallback
  if (body.sessionId.startsWith('bitrix24_')) {
    console.warn('[Bitrix24 Send] Local fallback sessionId detected, cannot send message to Bitrix24')
    throw createError({
      statusCode: 400,
      message: 'Используется локальная сессия. Для отправки сообщений нужна реальная сессия от Bitrix24. Используйте JavaScript виджет для создания сессии.'
    })
  }

  try {
    if (BITRIX24_WEBHOOK) {
      try {
        const webhookUrl = BITRIX24_WEBHOOK.endsWith('/') ? BITRIX24_WEBHOOK : `${BITRIX24_WEBHOOK}/`
        const apiUrl = `${webhookUrl}imopenlines.message.add`
        
        const messageData: any = {
          SESSION_ID: body.sessionId,
          MESSAGE: body.text
        }

        if (body.attachment) {
          messageData.ATTACH = [{
            ID: body.attachment.id,
            NAME: body.attachment.name,
            URL: body.attachment.url,
            SIZE: body.attachment.size
          }]
        }

        // Используем hash и chatId для отправки через виджет API (как в виджете Bitrix24)
        // Если hash и chatId есть, используем формат виджета
        // Иначе пробуем стандартные методы Open Lines
        
        let response: any
        
        if (body.hash && body.chatId) {
          // Вариант 1: Используем формат виджета с livechat_auth_id и CHAT_ID
          console.log('[Bitrix24 Send] Using widget API format with hash and chatId')
          const widgetUrl = `${webhookUrl}im.message.add.json`
          
          const formData = new URLSearchParams()
          formData.append('livechat_auth_id', body.hash)
          formData.append('CHAT_ID', body.chatId)
          formData.append('MESSAGE', body.text)
          formData.append('TEMPLATE_ID', `temporary${Date.now()}`)
          
          try {
            response = await $fetch<any>(widgetUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: formData.toString()
            })
            console.log('[Bitrix24 Send] Sent via im.message.add.json (widget format)')
          } catch (widgetError: any) {
            console.warn('[Bitrix24 Send] Widget format failed, trying standard methods:', widgetError.data?.error_description || widgetError.message)
            // Продолжаем с другими методами
          }
        }
        
        // Если виджет формат не сработал или hash/chatId не предоставлены, пробуем стандартные методы
        if (!response) {
          try {
            // Вариант 2: Используем imopenlines.message.add (стандартный метод Open Lines)
            const openlinesUrl = `${webhookUrl}imopenlines.message.add`
            console.log('[Bitrix24 Send] Trying imopenlines.message.add with SESSION_ID:', body.sessionId)
            response = await $fetch<any>(openlinesUrl, {
              method: 'POST',
              body: {
                SESSION_ID: body.sessionId,
                MESSAGE: body.text,
                ...(body.attachment ? {
                  ATTACH: [{
                    ID: body.attachment.id,
                    NAME: body.attachment.name,
                    URL: body.attachment.url,
                    SIZE: body.attachment.size
                  }]
                } : {})
              }
            })
            console.log('[Bitrix24 Send] Sent via imopenlines.message.add')
          } catch (openlinesError: any) {
            // Если не работает, пробуем im.message.add с DIALOG_ID
            if (openlinesError.data?.error === 'ERROR_METHOD_NOT_FOUND' || openlinesError.status === 404) {
              console.log('[Bitrix24 Send] imopenlines.message.add not found, trying im.message.add')
              const openlineId = config.bitrix24OpenlineId || '38'
              const dialogId = body.chatId ? `chat${body.chatId}` : `livechat|${openlineId}|${body.sessionId}`
              const alternativeUrl = `${webhookUrl}im.message.add`
              
              response = await $fetch<any>(alternativeUrl, {
                method: 'POST',
                body: {
                  DIALOG_ID: dialogId,
                  MESSAGE: body.text,
                  ...(body.attachment ? {
                    ATTACH: [{
                      ID: body.attachment.id,
                      NAME: body.attachment.name,
                      URL: body.attachment.url,
                      SIZE: body.attachment.size
                    }]
                  } : {})
                }
              })
              console.log('[Bitrix24 Send] Sent via im.message.add')
            } else {
              throw openlinesError
            }
          }
        }

        console.log('[Bitrix24 Send] API Response:', JSON.stringify(response, null, 2))

        if (response?.result) {
          const messageId = typeof response.result === 'string' 
            ? response.result 
            : response.result.MESSAGE_ID || response.result.ID || `msg_${Date.now()}`
            
          const message: Bitrix24ChatMessage = {
            id: messageId,
            text: body.text,
            authorId: '0',
            authorName: 'Вы',
            isOperator: false,
            createdAt: new Date().toISOString(),
            attachments: body.attachment ? [body.attachment] : undefined
          }

          console.log('[Bitrix24 Send] Returning message:', message)
          return { message }
        } else {
          console.warn('[Bitrix24 Send] No result in response')
          // Если нет result, но response есть - возможно это успешный ответ без result
          if (response && !response.error) {
            // Создаем сообщение даже если нет result
            const message: Bitrix24ChatMessage = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              text: body.text,
              authorId: '0',
              authorName: 'Вы',
              isOperator: false,
              createdAt: new Date().toISOString(),
              attachments: body.attachment ? [body.attachment] : undefined
            }
            console.log('[Bitrix24 Send] Message sent (no result field), returning:', message)
            return { message }
          }
          console.warn('[Bitrix24 Send] No result in response, will try fallback')
        }
      } catch (apiError: any) {
        console.error('[Bitrix24 Send] API error:', {
          message: apiError.message,
          status: apiError.status,
          statusText: apiError.statusText,
          data: apiError.data,
          response: apiError.response
        })
        
        // Если это ошибка от Bitrix24, выбрасываем её, а не используем fallback
        if (apiError.data?.error || apiError.status >= 400) {
          throw createError({
            statusCode: apiError.status || 500,
            message: `Ошибка Bitrix24 API: ${apiError.data?.error_description || apiError.data?.error || apiError.message || 'Неизвестная ошибка'}`
          })
        }
        // Продолжаем с fallback только если это сетевая ошибка
      }
    }

    // Fallback: создаем локальное сообщение (только если нет webhook или это сетевая ошибка)
    console.warn('[Bitrix24 Send] Using fallback message - сообщение не отправлено в Bitrix24!')
    const message: Bitrix24ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: body.text,
      authorId: '0',
      authorName: 'Вы',
      isOperator: false,
      createdAt: new Date().toISOString(),
      attachments: body.attachment ? [body.attachment] : undefined
    }

    return { message }
  } catch (error: any) {
    console.error('[Bitrix24 Send] Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Ошибка при отправке сообщения'
    })
  }
})
