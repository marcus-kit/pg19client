/**
 * Получение сообщений из чата Bitrix24 Open Lines
 * ⚠️ Webhook URL используется только на сервере!
 */
import type { Bitrix24ChatMessage } from '~/types/bitrix24'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const sessionId = query.sessionId as string
  const config = useRuntimeConfig()

  const BITRIX24_WEBHOOK = config.bitrix24WebhookUrl || ''

  console.log('[Bitrix24 Messages] Request:', { sessionId, hasWebhook: !!BITRIX24_WEBHOOK })

  if (!sessionId) {
    throw createError({
      statusCode: 400,
      message: 'sessionId обязателен'
    })
  }

  // Проверяем, что это реальный SESSION_ID от Bitrix24, а не локальный fallback
  if (sessionId.startsWith('bitrix24_')) {
    console.warn('[Bitrix24 Messages] Local fallback sessionId detected, cannot fetch messages from Bitrix24')
    return { messages: [] }
  }

  try {
    if (BITRIX24_WEBHOOK) {
      try {
        // Используем im.dialog.messages.get для получения сообщений из Open Lines чата
        // sessionId в нашем случае - это chatId, полученный от imopenlines.widget.user.register
        const webhookUrl = BITRIX24_WEBHOOK.endsWith('/') ? BITRIX24_WEBHOOK : `${BITRIX24_WEBHOOK}/`
        
        // Если sessionId - это chatId, используем его напрямую
        const dialogId = `chat${sessionId}`
        const messagesUrl = `${webhookUrl}im.dialog.messages.get`
        
        console.log('[Bitrix24 Messages] Calling API:', messagesUrl)
        console.log('[Bitrix24 Messages] Dialog ID:', dialogId)
        
        let response: any
        try {
          // Пробуем сначала imopenlines.session.history.get (если есть SESSION_ID)
          const historyUrl = `${webhookUrl}imopenlines.session.history.get`
          try {
            response = await $fetch<any>(historyUrl, {
              method: 'POST',
              body: {
                SESSION_ID: sessionId
              }
            })
            console.log('[Bitrix24 Messages] Got messages via imopenlines.session.history.get')
          } catch (historyError: any) {
            // Если не работает, используем im.dialog.messages.get с chatId
            if (historyError.data?.error === 'ERROR_METHOD_NOT_FOUND' || historyError.status === 404) {
              console.log('[Bitrix24 Messages] imopenlines.session.history.get not found, trying im.dialog.messages.get')
              response = await $fetch<any>(messagesUrl, {
                method: 'POST',
                body: {
                  DIALOG_ID: dialogId,
                  LIMIT: 50
                }
              })
              console.log('[Bitrix24 Messages] Got messages via im.dialog.messages.get')
            } else {
              throw historyError
            }
          }
        } catch (dialogError: any) {
          // Если и это не работает, пробуем альтернативный формат DIALOG_ID
          console.log('[Bitrix24 Messages] Trying alternative DIALOG_ID format')
          const openlineId = config.bitrix24OpenlineId || '38'
          const alternativeDialogId = `livechat|${openlineId}|${sessionId}`
          
          response = await $fetch<any>(messagesUrl, {
            method: 'POST',
            body: {
              DIALOG_ID: alternativeDialogId,
              LIMIT: 50
            }
          })
          console.log('[Bitrix24 Messages] Got messages via alternative DIALOG_ID')
        }

        console.log('[Bitrix24 Messages] API Response:', JSON.stringify(response, null, 2))

        if (response?.result) {
          // Для imopenlines.session.history.get формат ответа:
          // result.message - объект с сообщениями (ключ - ID сообщения)
          // result.users - информация о пользователях
          // result.userId - ID пользователя
          
          let messagesArray: any[] = []
          
          if (response.result.message && typeof response.result.message === 'object') {
            // Преобразуем объект сообщений в массив
            messagesArray = Object.values(response.result.message)
          } else if (response.result.messages && Array.isArray(response.result.messages)) {
            // Альтернативный формат: массив сообщений
            messagesArray = response.result.messages
          }
          
          const users = response.result.users || {}
          const userId = response.result.userId || '0'
          
          const messages: Bitrix24ChatMessage[] = messagesArray.map((msg: any) => {
            const authorId = msg.senderid || msg.SENDER_ID || msg.author_id || msg.authorId || '0'
            const authorInfo = users[authorId] || {}
            // Бот или оператор - это любой пользователь, который не является текущим пользователем
            const isOperator = authorId !== userId && authorId !== '0'
            
            // Определяем имя отправителя
            let authorName = 'Вы'
            if (isOperator) {
              // Проверяем, является ли это ботом (обычно боты имеют специальные ID или имена)
              if (authorInfo.name && (authorInfo.name.includes('Bot') || authorInfo.name.includes('бот') || authorInfo.name.includes('Amik'))) {
                authorName = authorInfo.name || 'Amik Bot'
              } else {
                authorName = authorInfo.name || authorInfo.NAME || 'Оператор'
              }
            }
            
            return {
              id: String(msg.id || msg.ID || `msg_${Date.now()}`),
              text: msg.text || msg.MESSAGE || msg.textlegacy || '',
              authorId: String(authorId),
              authorName: authorName,
              isOperator: isOperator,
              createdAt: msg.date || msg.DATE_CREATE || msg.createdAt || new Date().toISOString(),
              attachments: msg.attach || msg.ATTACH ? [{
                id: String((msg.attach?.[0]?.id || msg.ATTACH?.ID || '')),
                name: (msg.attach?.[0]?.name || msg.ATTACH?.NAME || 'Файл'),
                url: (msg.attach?.[0]?.url || msg.ATTACH?.URL || ''),
                type: (msg.attach?.[0]?.type || msg.ATTACH?.TYPE === 'image' ? 'image' : 'file'),
                size: (msg.attach?.[0]?.size || msg.ATTACH?.SIZE || 0)
              }] : undefined
            }
          })

          console.log('[Bitrix24 Messages] Parsed messages:', messages.length)
          return { messages }
        }
      } catch (apiError: any) {
        console.error('[Bitrix24 Messages] API error:', {
          message: apiError.message,
          status: apiError.statusCode,
          data: apiError.data
        })
      }
    }

    console.log('[Bitrix24 Messages] Using fallback (empty array)')
    return { messages: [] }
  } catch (error: any) {
    console.error('[Bitrix24 Messages] Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Ошибка при загрузке сообщений'
    })
  }
})
