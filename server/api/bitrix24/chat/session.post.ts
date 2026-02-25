/**
 * Создание или получение сессии чата Bitrix24 Open Lines
 * ⚠️ Webhook URL используется только здесь, на сервере!
 */
import type { Bitrix24ChatSession } from '~/types/bitrix24'

interface SessionRequest {
  userId?: string
  userName?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SessionRequest>(event)
  const config = useRuntimeConfig()
  const userStore = await getUserFromSession(event)

  // ⚠️ Webhook URL доступен только на сервере, не попадает на клиент!
  const BITRIX24_WEBHOOK = config.bitrix24WebhookUrl || ''
  // CONFIG_ID (OpenLine ID) из настроек
  const OPENLINE_ID = config.bitrix24OpenlineId || '38'

  // Логирование для отладки
  console.log('[Bitrix24] Webhook URL configured:', !!BITRIX24_WEBHOOK)
  console.log('[Bitrix24] OpenLine ID:', OPENLINE_ID || 'not set (will use 0)')
  console.log('[Bitrix24] User ID:', userStore?.id)

  try {
    // Если есть webhook URL, используем Bitrix24 REST API
    if (BITRIX24_WEBHOOK) {
      try {
        // Убеждаемся, что URL заканчивается на /
        const webhookUrl = BITRIX24_WEBHOOK.endsWith('/') ? BITRIX24_WEBHOOK : `${BITRIX24_WEBHOOK}/`
        
        const userId = userStore?.id || body.userId || `guest_${Date.now()}`
        const userName = body.userName || 'Гость'
        // Преобразуем CONFIG_ID в число, так как Bitrix24 API может требовать число, а не строку
        const configId = Number(OPENLINE_ID) || parseInt(OPENLINE_ID || '38', 10) || 38
        
        console.log('[Bitrix24] Creating Open Lines session for bot Amik Bot')
        console.log('[Bitrix24] Using CONFIG_ID:', configId, '(type:', typeof configId, ')')
        console.log('[Bitrix24] Webhook URL:', webhookUrl.substring(0, 50) + '...')
        
        // Сначала проверяем доступность webhook и прав
        try {
          const testUrl = `${webhookUrl}server.time`
          console.log('[Bitrix24] Testing webhook availability:', testUrl)
          const testResponse = await $fetch<any>(testUrl)
          console.log('[Bitrix24] Webhook test successful:', testResponse)
        } catch (testError: any) {
          console.error('[Bitrix24] Webhook test failed:', testError.data?.error_description || testError.message)
          throw createError({
            statusCode: 500,
            message: `Webhook недоступен или неверный: ${testError.data?.error_description || testError.message}`
          })
        }
        
        // Используем imopenlines.session.start напрямую (без методов виджета)
        // Методы виджета недоступны через обычный webhook
        const sessionApiUrl = `${webhookUrl}imopenlines.session.start`
        console.log('[Bitrix24] Session API URL:', sessionApiUrl)
        
        // Пробуем разные форматы USER_CODE
        const userCodeVariants = [
          `${userId}`,  // Просто USER_ID (пробуем первым, так как это самый простой формат)
          `livechat|${configId}|${userId}`,  // Формат: livechat|CONFIG_ID|USER_ID
          `guest_${userId}`,  // С префиксом guest
        ]
        
        let lastError: any = null
        
        for (const userCode of userCodeVariants) {
          try {
            console.log('[Bitrix24] Trying USER_CODE:', userCode)
            console.log('[Bitrix24] Request URL:', sessionApiUrl)
            console.log('[Bitrix24] Request body:', {
              CONFIG_ID: Number(configId),
              USER_CODE: userCode,
              MODE: 'input',
              USER_NAME: userName
            })
            
            // Пробуем разные варианты параметров
            const requestBodies = [
              {
                CONFIG_ID: Number(configId),
                USER_CODE: userCode,
                MODE: 'input',
                USER_NAME: userName
              },
              {
                CONFIG_ID: Number(configId),
                USER_CODE: userCode,
                USER_NAME: userName
                // Без MODE
              },
              {
                CONFIG_ID: String(configId), // Пробуем как строку тоже
                USER_CODE: userCode,
                USER_NAME: userName
              }
            ]
            
            let sessionResponse: any = null
            let lastRequestBodyError: any = null
            
            for (const requestBody of requestBodies) {
              try {
                console.log('[Bitrix24] Trying request body:', requestBody)
                sessionResponse = await $fetch<any>(sessionApiUrl, {
                  method: 'POST',
                  body: requestBody
                })
                console.log('[Bitrix24] Request successful with body:', requestBody)
                break // Если успешно, выходим из цикла
              } catch (bodyError: any) {
                console.warn('[Bitrix24] Request body failed:', requestBody, bodyError.data?.error_description || bodyError.message)
                lastRequestBodyError = bodyError
                continue
              }
            }
            
            if (!sessionResponse) {
              throw lastRequestBodyError || new Error('Все варианты параметров не сработали')
            }
            
            console.log('[Bitrix24] Session API Response:', JSON.stringify(sessionResponse, null, 2))
            
            if (sessionResponse?.result) {
              // Получаем SESSION_ID из ответа
              const sessionId = sessionResponse.result.SESSION_ID || 
                                sessionResponse.result.ID || 
                                sessionResponse.result.sessionId ||
                                sessionResponse.result
              
              if (sessionId) {
                const session: Bitrix24ChatSession = {
                  id: String(sessionId),
                  status: 'active',
                  operatorId: sessionResponse.result.OPERATOR_ID,
                  operatorName: sessionResponse.result.OPERATOR_NAME || 'Amik Bot',
                  createdAt: new Date().toISOString()
                }

                console.log('[Bitrix24] Open Lines session created successfully. Session ID:', sessionId)
                return { session }
              }
            }
            
            // Если ответ есть, но нет SESSION_ID, пробуем следующий вариант
            if (sessionResponse?.result) {
              console.warn('[Bitrix24] Response received but no SESSION_ID found, trying next USER_CODE format')
              lastError = { message: 'No SESSION_ID in response', response: sessionResponse }
              continue
            }
          } catch (sessionError: any) {
            console.error('[Bitrix24] USER_CODE format failed:', userCode)
            console.error('[Bitrix24] Error details:', {
              error: sessionError.data?.error,
              error_description: sessionError.data?.error_description,
              error_code: sessionError.data?.error_code,
              message: sessionError.message,
              status: sessionError.status,
              statusText: sessionError.statusText,
              fullError: sessionError.data
            })
            lastError = sessionError
            // Пробуем следующий вариант
            continue
          }
        }
        
        // Если все варианты не сработали, выбрасываем ошибку с подробной информацией
        const errorDetails = lastError?.data || {}
        const errorMessage = errorDetails.error_description || 
                           errorDetails.error || 
                           lastError?.message || 
                           'Все варианты USER_CODE не сработали'
        
        console.error('[Bitrix24] Все варианты USER_CODE не сработали. Последняя ошибка:', {
          error: errorDetails.error,
          error_description: errorDetails.error_description,
          error_code: errorDetails.error_code,
          configId: configId,
          webhookUrl: webhookUrl.substring(0, 50) + '...'
        })
        
        throw createError({
          statusCode: 500,
          message: `Не удалось создать сессию Open Lines: ${errorMessage}. CONFIG_ID: ${configId}. Проверьте: 1) Права webhook на imopenlines, 2) Активность Open Line, 3) Подключен ли бот Amik Bot к линии.`
        })
      } catch (apiError: any) {
        console.error('[Bitrix24] API error:', apiError)
        console.error('[Bitrix24] Error details:', {
          message: apiError.message,
          status: apiError.status,
          statusText: apiError.statusText,
          data: apiError.data
        })
        
        throw createError({
          statusCode: 500,
          message: `Ошибка Bitrix24 API: ${apiError.data?.error_description || apiError.message || 'Неизвестная ошибка'}`
        })
      }
    }

    // Если нет webhook URL, тоже выбрасываем ошибку
    throw createError({
      statusCode: 500,
      message: 'BITRIX24_WEBHOOK_URL не настроен. Настройте webhook URL в .env файле.'
    })
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Ошибка при создании сессии чата'
    })
  }
})
