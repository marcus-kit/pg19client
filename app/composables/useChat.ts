import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Chat, ChatMessage, UploadedFile } from '~/types/chat'

export function useChat() {
  const supabase = useSupabaseClient()
  const chatStore = useChatStore()

  const session = ref<Chat | null>(null)
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isSending = ref(false)
  const isUploading = ref(false)
  const error = ref<string | null>(null)

  let channel: RealtimeChannel | null = null

  // Создать или получить чат
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

      // Загружаем историю сообщений
      await loadMessages()

      // Отписываемся от старой подписки и создаём новую
      await unsubscribe()
      await subscribe()

      return { session: newChat, isNew }
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      error.value = err.data?.message || 'Ошибка при создании чата'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  // Загрузить сообщения
  async function loadMessages() {
    if (!session.value) return

    try {
      const { messages: loadedMessages } = await $fetch<{
        messages: ChatMessage[]
        total: number
      }>('/api/chat/messages', {
        query: { chatId: session.value.id }
      })

      messages.value = loadedMessages
    } catch (e) {
      console.error('Error loading messages:', e)
    }
  }

  // Загрузить файл
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

  // Отправить сообщение (с опциональным вложением)
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

      // Сообщения добавятся через Realtime, но на всякий случай
      // проверяем что их ещё нет
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

  // Закрыть чат
  async function closeSession() {
    if (!session.value) return

    try {
      await $fetch('/api/chat/close', {
        method: 'POST',
        body: { chatId: session.value.id }
      })

      // Обновляем статус через spread для реактивности
      if (session.value) {
        session.value = { ...session.value, status: 'closed' }
      }
    } catch (e) {
      console.error('Error closing chat:', e)
    } finally {
      // Всегда отписываемся, даже при ошибке
      await unsubscribe()
    }
  }

  // Подписка на Realtime
  async function subscribe() {
    if (!session.value) return

    // Отписываемся от предыдущего канала (защита от race condition)
    if (channel) {
      await supabase.removeChannel(channel)
      channel = null
    }

    channel = supabase
      .channel(`chat:${session.value.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'client',
          table: 'chat_messages',
          filter: `chat_id=eq.${session.value.id}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage
          // Проверяем что сообщения ещё нет (могло прийти от sendMessage)
          if (!messages.value.find(m => m.id === newMessage.id)) {
            messages.value.push(newMessage)
            // Для сообщений не от пользователя: счётчик непрочитанных
            if (newMessage.sender_type !== 'user') {
              // playNotificationSound() // TODO: добавить /public/sounds/notification.mp3
              chatStore.incrementUnread()
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'client',
          table: 'chats',
          filter: `id=eq.${session.value.id}`
        },
        (payload) => {
          // Обновляем статус чата
          if (session.value) {
            Object.assign(session.value, payload.new)
          }
        }
      )
      .subscribe()
  }

  // Отписка
  async function unsubscribe(): Promise<void> {
    if (channel) {
      await supabase.removeChannel(channel)
      channel = null
    }
  }

  // Очистка при размонтировании
  onUnmounted(() => {
    // void используется т.к. onUnmounted не поддерживает async
    void unsubscribe()
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
