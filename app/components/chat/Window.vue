<script setup lang="ts">
import type { UploadedFile } from '~/types/chat'
import { formatFileSize } from '~/composables/useFormatters'

const chatStore = useChatStore()
const authStore = useAuthStore()

const { session, messages, isLoading, isSending, isUploading, error, initSession, uploadFile, sendMessage } = useChat()

const showGuestForm = ref(false)
const messageText = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const isOperatorTyping = ref(false)

// Состояние для вложений
const fileInput = ref<HTMLInputElement | null>(null)
const pendingFile = ref<File | null>(null)
const pendingPreview = ref<string | null>(null)

// Допустимые типы файлов
const ACCEPT_FILES = 'image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Статус чата (бот неотличим от оператора)
const statusText = computed(() => {
  if (!session.value) return ''
  if (session.value.status === 'closed') return 'Чат закрыт'
  return 'Оператор онлайн'
})

// Отслеживаем последнее сообщение для скрытия typing при ответе бота/оператора
const lastMessage = computed(() => messages.value[messages.value.length - 1])

watch(lastMessage, (newMsg) => {
  if (!newMsg) return
  // Скрываем typing когда пришёл ответ от бота/оператора
  if (newMsg.sender_type === 'bot' || newMsg.sender_type === 'admin') {
    isOperatorTyping.value = false
  }
})

// Инициализация сессии при монтировании
// pinia-plugin-persistedstate автоматически восстанавливает sessionId из localStorage
onMounted(async () => {
  const savedSessionId = chatStore.sessionId

  // Если есть сохранённый sessionId - пробуем восстановить
  if (savedSessionId) {
    try {
      await initSession({
        chatId: savedSessionId,
        userId: authStore.user?.id
      })
      // Обновляем sessionId если сессия восстановлена
      if (session.value) {
        chatStore.setSessionId(session.value.id)
        // Скроллим к последнему сообщению после загрузки истории
        scrollToBottom()
      }
    } catch {
      // Если сессия не найдена или закрыта - сбрасываем
      // pinia-plugin-persistedstate автоматически обновит localStorage
      chatStore.sessionId = null
      chatStore.guestName = null
      // Показываем форму гостя если не авторизован
      if (!authStore.isAuthenticated) {
        showGuestForm.value = true
      }
    }
  }

  // Если нет сохранённого sessionId и сессия не была восстановлена
  if (!savedSessionId && !session.value) {
    if (authStore.isAuthenticated) {
      // Авторизованный пользователь
      await initSession({ userId: authStore.user?.id })
      // Сохраняем sessionId для восстановления
      if (session.value) {
        chatStore.setSessionId(session.value.id)
        scrollToBottom()
      }
    } else {
      // Гость - показываем форму
      showGuestForm.value = true
    }
  }
})

// Функция скролла к последнему сообщению
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Автоскролл при новых сообщениях
watch(messages, scrollToBottom, { deep: true })

// Автоскролл при появлении typing indicator
watch(isOperatorTyping, (typing) => {
  if (typing) scrollToBottom()
})

// Инициализация для гостя
async function initGuestSession(data: { name: string; contact?: string }) {
  await initSession({
    guestName: data.name,
    guestContact: data.contact
  })
  chatStore.setGuestName(data.name)
  if (session.value) {
    chatStore.setSessionId(session.value.id)
    scrollToBottom()
  }
  showGuestForm.value = false
}

// Открыть диалог выбора файла
function openFileDialog() {
  fileInput.value?.click()
}

// Обработка выбора файла
function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // Сбрасываем input для повторного выбора того же файла
  input.value = ''

  // Валидация размера
  if (file.size > MAX_FILE_SIZE) {
    // Используем error из useChat
    alert('Размер файла не должен превышать 10 МБ')
    return
  }

  pendingFile.value = file

  // Preview для изображений
  if (file.type.startsWith('image/')) {
    pendingPreview.value = URL.createObjectURL(file)
  } else {
    pendingPreview.value = null
  }
}

// Удалить pending file
function removePendingFile() {
  pendingFile.value = null
  if (pendingPreview.value) {
    URL.revokeObjectURL(pendingPreview.value)
    pendingPreview.value = null
  }
}

// Отправка сообщения (с опциональным вложением)
async function handleSend() {
  if ((!messageText.value.trim() && !pendingFile.value) || isSending.value || isUploading.value) return

  const text = messageText.value
  const file = pendingFile.value

  // Очищаем поля до отправки
  messageText.value = ''
  removePendingFile()

  try {
    // Загружаем файл если есть
    let attachment: UploadedFile | undefined
    if (file) {
      attachment = await uploadFile(file)
    }

    await sendMessage(text, attachment)
    // Сбрасываем счётчик непрочитанных
    chatStore.clearUnread()
    // Показываем typing с небольшой задержкой (оператор "читает" сообщение)
    setTimeout(() => {
      isOperatorTyping.value = true
    }, 300)
  } catch {
    // Возвращаем текст обратно при ошибке
    messageText.value = text
    // Файл не восстанавливаем (уже загружен или потерян)
  }
}

// Обработка Enter
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

</script>

<template>
  <div class="w-[380px] h-[520px] glass-card rounded-2xl shadow-2xl flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/10">
          <Icon name="heroicons:chat-bubble-left-right" class="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 class="font-semibold text-[var(--text-primary)]">Поддержка ПЖ19</h3>
          <p class="text-xs text-[var(--text-muted)]">{{ statusText }}</p>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <button
          @click="chatStore.minimize()"
          class="p-2 rounded-lg hover:bg-white/10 transition-colors"
          title="Свернуть"
        >
          <Icon name="heroicons:minus" class="w-5 h-5 text-[var(--text-muted)]" />
        </button>
        <button
          @click="chatStore.close()"
          class="p-2 rounded-lg hover:bg-white/10 transition-colors"
          title="Закрыть"
        >
          <Icon name="heroicons:x-mark" class="w-5 h-5 text-[var(--text-muted)]" />
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Loading -->
      <div v-if="isLoading" class="flex-1 flex items-center justify-center">
        <Icon name="heroicons:arrow-path" class="w-8 h-8 text-primary animate-spin" />
      </div>

      <!-- Guest Form -->
      <ChatGuestForm
        v-else-if="showGuestForm"
        @submit="initGuestSession"
      />

      <!-- Messages -->
      <template v-else>
        <div
          ref="messagesContainer"
          class="flex-1 overflow-y-auto p-4 space-y-3"
        >
          <!-- Welcome message -->
          <div v-if="messages.length === 0" class="text-center py-8">
            <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
              <Icon name="heroicons:sparkles" class="w-8 h-8 text-primary" />
            </div>
            <h4 class="font-semibold text-[var(--text-primary)] mb-2">Добро пожаловать!</h4>
            <p class="text-sm text-[var(--text-muted)]">
              Напишите ваш вопрос и наш оператор ответит вам
            </p>
          </div>

          <ChatMessage
            v-for="msg in messages"
            :key="msg.id"
            :message="msg"
          />

          <!-- Typing indicator -->
          <div v-if="isOperatorTyping" class="flex gap-2">
            <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-accent/20">
              <Icon name="heroicons:user-circle" class="w-4 h-4 text-accent" />
            </div>
            <div class="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3">
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 bg-accent rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                <span class="w-2 h-2 bg-accent rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                <span class="w-2 h-2 bg-accent rounded-full animate-bounce" style="animation-delay: 300ms"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div class="p-4 border-t border-white/10">
          <div v-if="error" class="text-red-400 text-sm mb-2">{{ error }}</div>

          <!-- Pending file preview -->
          <div v-if="pendingFile" class="mb-3 p-2 rounded-lg bg-white/5 flex items-center gap-2">
            <img
              v-if="pendingPreview"
              :src="pendingPreview"
              class="w-12 h-12 rounded object-cover flex-shrink-0"
            />
            <div v-else class="w-12 h-12 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon name="heroicons:document" class="w-6 h-6 text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm truncate text-[var(--text-primary)]">{{ pendingFile.name }}</p>
              <p class="text-xs text-[var(--text-muted)]">{{ formatFileSize(pendingFile.size) }}</p>
            </div>
            <button
              @click="removePendingFile"
              class="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
              title="Удалить"
            >
              <Icon name="heroicons:x-mark" class="w-4 h-4 text-[var(--text-muted)]" />
            </button>
          </div>

          <!-- Hidden file input -->
          <input
            ref="fileInput"
            type="file"
            :accept="ACCEPT_FILES"
            class="hidden"
            @change="handleFileSelect"
          />

          <div class="flex items-end gap-2">
            <!-- Attach button (только для авторизованных) -->
            <button
              v-if="authStore.isAuthenticated"
              @click="openFileDialog"
              :disabled="isSending || isUploading"
              class="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              title="Прикрепить файл"
            >
              <Icon name="heroicons:paper-clip" class="w-5 h-5 text-[var(--text-muted)]" />
            </button>

            <textarea
              v-model="messageText"
              @keydown="handleKeydown"
              placeholder="Напишите сообщение..."
              rows="1"
              class="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none max-h-32"
              :disabled="isSending || isUploading"
            ></textarea>

            <button
              @click="handleSend"
              :disabled="(!messageText.trim() && !pendingFile) || isSending || isUploading"
              class="w-12 h-12 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all"
            >
              <Icon
                :name="isUploading ? 'heroicons:arrow-path' : isSending ? 'heroicons:arrow-path' : 'heroicons:paper-airplane'"
                class="w-5 h-5"
                :class="{ 'animate-spin': isSending || isUploading }"
              />
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
