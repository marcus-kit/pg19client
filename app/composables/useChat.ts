import type { Chat, ChatMessage, UploadedFile } from '~/types/chat'

const CHAT_POLL_INTERVAL_MS = 4000

export function useChat() {
  const chatStore = useChatStore()

  const session = ref<Chat | null>(null)
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isSending = ref(false)
  const isUploading = ref(false)
  const error = ref<string | null>(null)

  let pollInterval: ReturnType<typeof setInterval> | null = null

  async function initSession(options: {
    chatId?: string
    userId?: string
    guestName?: string
    guestContact?: string
  }) {
    isLoading.value = true
    error.value = null

    try {
      const { session: newChat, isNew } = await $fetch<{
        session: Chat
        isNew: boolean
      }>('/api/chat/session', {
        method: 'POST',
        body: options
      })

      session.value = newChat

      await loadMessages()

      stopPolling()
      startPolling()

      return { session: newChat, isNew }
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      error.value = err.data?.message || 'Ошибка при создании чата'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function loadMessages() {
    if (!session.value) return

    try {
      const { messages: loadedMessages } = await $fetch<{
        messages: ChatMessage[]
        total: number
      }>('/api/chat/messages', {
        query: { chatId: session.value.id }
      })

      const prevCount = messages.value.length
      messages.value = loadedMessages
      if (loadedMessages.length > prevCount) {
        const newFromOther = loadedMessages
          .filter(m => m.sender_type !== 'user')
          .slice(prevCount)
        if (newFromOther.length) {
          chatStore.incrementUnread()
        }
      }
    } catch (e) {
      console.error('Error loading messages:', e)
    }
  }

  async function uploadFile(file: File): Promise<UploadedFile> {
    if (!session.value) {
      throw new Error('Нет активной сессии чата')
    }

    isUploading.value = true
    error.value = null

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('chatId', session.value.id)

      const result = await $fetch<UploadedFile>('/api/chat/upload', {
        method: 'POST',
        body: formData
      })

      return result
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      error.value = err.data?.message || 'Ошибка при загрузке файла'
      throw e
    } finally {
      isUploading.value = false
    }
  }

  async function sendMessage(text: string, attachment?: UploadedFile) {
    if (!session.value || (!text.trim() && !attachment)) return

    isSending.value = true
    error.value = null

    try {
      const result = await $fetch<{
        message: ChatMessage
      }>('/api/chat/send', {
        method: 'POST',
        body: {
          chatId: session.value.id,
          message: text.trim(),
          contentType: attachment ? (attachment.isImage ? 'image' : 'file') : 'text',
          attachmentUrl: attachment?.url,
          attachmentName: attachment?.name,
          attachmentSize: attachment?.size
        }
      })

      if (!messages.value.find(m => m.id === result.message.id)) {
        messages.value.push(result.message)
      }

      return result
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      error.value = err.data?.message || 'Ошибка при отправке'
      throw e
    } finally {
      isSending.value = false
    }
  }

  async function closeSession() {
    if (!session.value) return

    try {
      await $fetch('/api/chat/close', {
        method: 'POST',
        body: { chatId: session.value.id }
      })

      if (session.value) {
        session.value = { ...session.value, status: 'closed' }
      }
    } catch (e) {
      console.error('Error closing chat:', e)
    } finally {
      stopPolling()
    }
  }

  function startPolling() {
    if (!session.value || pollInterval) return

    pollInterval = setInterval(() => {
      if (!session.value || session.value.status === 'closed') {
        stopPolling()
        return
      }
      loadMessages()
    }, CHAT_POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  function unsubscribe() {
    stopPolling()
  }

  onUnmounted(() => {
    unsubscribe()
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
    uploadFile,
    sendMessage,
    closeSession,
    unsubscribe
  }
}
