/**
 * Composable для работы с Bitrix24 Open Lines через REST API
 * ⚠️ Webhook URL используется только на сервере, никогда не попадает на клиент!
 */
import type { Bitrix24ChatSession, Bitrix24ChatMessage, Bitrix24Attachment } from '~/types/bitrix24'

export function useBitrix24Chat() {
  const session = ref<Bitrix24ChatSession | null>(null)
  const messages = ref<Bitrix24ChatMessage[]>([])
  const isLoading = ref(false)
  const isSending = ref(false)
  const isUploading = ref(false)
  const error = ref<string | null>(null)

  // Создать или получить сессию чата через REST API
  async function initSession(userId?: string, userName?: string) {
    isLoading.value = true
    error.value = null

    try {
      console.log('[useBitrix24Chat] Initializing session via REST API for:', { userId, userName })
      
      // Создаем сессию через REST API
      const { session: newSession } = await $fetch<{
        session: Bitrix24ChatSession
      }>('/api/bitrix24/chat/session', {
        method: 'POST',
        body: {
          userId,
          userName
        }
      })
      
      if (newSession) {
        console.log('[useBitrix24Chat] Session created:', newSession.id)
        session.value = newSession
        await loadMessages()
        return session.value
      }
      
      throw new Error('Не удалось создать сессию')
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      const errorMessage = err.data?.message || 'Ошибка при создании чата'
      console.error('[useBitrix24Chat] Error:', errorMessage, e)
      error.value = errorMessage
      throw e
    } finally {
      isLoading.value = false
    }
  }

  // Загрузить сообщения
  async function loadMessages() {
    if (!session.value) {
      console.log('[useBitrix24Chat] loadMessages: no session')
      return
    }

    try {
      console.log('[useBitrix24Chat] Loading messages for session:', session.value.id)
      
      const { messages: loadedMessages } = await $fetch<{
        messages: Bitrix24ChatMessage[]
      }>('/api/bitrix24/chat/messages', {
        query: { sessionId: session.value.id }
      })

      console.log('[useBitrix24Chat] Loaded messages:', loadedMessages.length)

      // Объединяем новые сообщения с существующими, избегая дубликатов
      const existingIds = new Set(messages.value.map(m => m.id))
      const newMessages = loadedMessages.filter(m => !existingIds.has(m.id))
      
      if (newMessages.length > 0) {
        console.log('[useBitrix24Chat] Adding', newMessages.length, 'new messages')
        messages.value = [...messages.value, ...newMessages].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      } else if (loadedMessages.length > 0 && messages.value.length === 0) {
        // Если нет новых, но есть загруженные и у нас пустой массив - обновляем
        console.log('[useBitrix24Chat] Setting initial messages:', loadedMessages.length)
        messages.value = loadedMessages
      }
    } catch (e) {
      console.error('[useBitrix24Chat] Error loading messages:', e)
    }
  }

  // Отправить сообщение через REST API
  async function sendMessage(text: string, attachment?: Bitrix24Attachment) {
    if (!text.trim()) return
    
    // Проверяем, что сессия создана
    if (!session.value) {
      const errorMsg = 'Сессия чата не создана. Не удалось подключиться к Bitrix24. Проверьте настройки CONFIG_ID и права webhook.'
      console.error('[useBitrix24Chat] Cannot send message: no session', errorMsg)
      error.value = errorMsg
      throw new Error(errorMsg)
    }

    isSending.value = true
    error.value = null

    try {
      console.log('[useBitrix24Chat] Sending message via REST API:', { text, sessionId: session.value.id })
      
      const { message } = await $fetch<{
        message: Bitrix24ChatMessage
      }>('/api/bitrix24/chat/send', {
        method: 'POST',
        body: {
          sessionId: session.value.id,
          text: text.trim(),
          attachment,
          hash: session.value.hash,  // Передаем hash для виджета API
          chatId: session.value.chatId  // Передаем chatId для виджета API
        }
      })

      console.log('[useBitrix24Chat] Message sent, received:', message)

      // Добавляем сообщение в массив, если его еще нет
      const existingMessage = messages.value.find(m => m.id === message.id)
      if (!existingMessage) {
        messages.value.push(message)
      }
      
      // Перезагружаем сообщения через небольшую задержку, чтобы Bitrix24 успел обработать
      setTimeout(async () => {
        await loadMessages()
      }, 1000)
      
      return message
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      const errorMessage = err.data?.message || 'Ошибка при отправке'
      console.error('[useBitrix24Chat] Send error:', errorMessage, e)
      error.value = errorMessage
      throw e
    } finally {
      isSending.value = false
    }
  }

  // Загрузить файл
  async function uploadFile(file: File): Promise<Bitrix24Attachment> {
    if (!session.value) {
      throw new Error('Нет активной сессии чата')
    }

    isUploading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sessionId', session.value.id)

      const result = await $fetch<Bitrix24Attachment>('/api/bitrix24/chat/upload', {
        method: 'POST',
        body: formData
      })

      return result
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      throw new Error(err.data?.message || 'Ошибка при загрузке файла')
    } finally {
      isUploading.value = false
    }
  }

  // Закрыть сессию
  async function closeSession() {
    if (!session.value) return

    try {
      await $fetch('/api/bitrix24/chat/close', {
        method: 'POST',
        body: { sessionId: session.value.id }
      })

      session.value = { ...session.value, status: 'closed' }
    } catch (e) {
      console.error('Error closing chat:', e)
    }
  }

  // Опрос новых сообщений (polling)
  let pollingInterval: ReturnType<typeof setInterval> | null = null
  let sessionCheckInterval: ReturnType<typeof setInterval> | null = null

  function startPolling(interval = 3000) {
    if (pollingInterval) return

    pollingInterval = setInterval(async () => {
      if (session.value && session.value.status === 'active') {
        await loadMessages()
      }
    }, interval)
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval)
      sessionCheckInterval = null
    }
  }

  onUnmounted(() => {
    stopPolling()
  })

  return {
    session,
    messages,
    isLoading,
    isSending,
    isUploading,
    error,
    initSession,
    loadMessages,
    sendMessage,
    uploadFile,
    closeSession,
    startPolling,
    stopPolling
  }
}
