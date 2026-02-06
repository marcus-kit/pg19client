<script setup lang="ts">
/**
 * Страница поддержки — две вкладки:
 * 1. Чат — realtime чат с оператором/ботом (useChat composable)
 * 2. FAQ — частые вопросы (accordion)
 *
 * Особенности:
 * - Чат инициализируется лениво (только при открытии вкладки)
 * - Поддержка вложений в чате (изображения, документы)
 */

import type { ChatMessage } from '~/types/chat'
import { formatFileSize } from '~/composables/useFormatters'

definePageMeta({
  middleware: 'auth'
})

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const route = useRoute()
const chatStore = useChatStore()
const userStore = useUserStore()
const { fetchFaq } = useFaq()

// =============================================================================
// DATA — загрузка FAQ
// =============================================================================

const { faq, pending: faqPending } = await fetchFaq()

// useChat — composable для работы с чатом (session, messages, send, upload)
const {
  session,
  messages,
  isLoading: chatLoading,
  isSending,
  isUploading,
  error: chatError,
  initSession,
  uploadFile,
  sendMessage
} = useChat()

// =============================================================================
// STATE — локальное состояние страницы
// =============================================================================

// Вкладки — определяем начальную из query параметра (?tab=faq)
const initialTab = (['faq', 'chat'].includes(route.query.tab as string)
  ? route.query.tab
  : 'chat') as 'faq' | 'chat'
const activeTab = ref<'faq' | 'chat'>(initialTab)

// Чат
const messageText = ref('')                              // Текст сообщения в поле ввода
const messagesContainer = ref<HTMLElement | null>(null)  // Ref на контейнер сообщений (для скролла)
const chatInitialized = ref(false)                       // Флаг: чат уже инициализирован
const isOperatorTyping = ref(false)                      // Показать индикатор "оператор печатает"

// Вложения в чате
const fileInput = ref<HTMLInputElement | null>(null)     // Скрытый input[type=file]
const pendingFile = ref<File | null>(null)               // Выбранный файл (до отправки)
const pendingPreview = ref<string | null>(null)          // Preview URL для изображений

// FAQ
const expandedFaq = ref<number | null>(null)             // ID развёрнутого вопроса

// =============================================================================
// COMPUTED
// =============================================================================

// Отслеживаем последнее сообщение — скрываем typing когда пришёл ответ
const lastMessage = computed(() => messages.value[messages.value.length - 1])

// =============================================================================
// CONSTANTS
// =============================================================================

const ACCEPT_FILES = 'image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// =============================================================================
// METHODS
// =============================================================================

// Скролл к последнему сообщению
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Ленивая инициализация чата (только при открытии вкладки)
async function initChatSession() {
  if (chatInitialized.value) return
  chatInitialized.value = true

  // Пробуем восстановить существующую сессию из store
  const savedSessionId = chatStore.sessionId
  if (savedSessionId) {
    try {
      await initSession({ chatId: savedSessionId, userId: userStore.user?.id })
      if (session.value) {
        chatStore.setSessionId(session.value.id)
        scrollToBottom()
      }
    } catch {
      // Сессия не найдена — сбрасываем
      chatStore.sessionId = null
    }
  }

  // Создаём новую сессию если нет существующей
  if (!savedSessionId && !session.value && userStore.isAuthenticated) {
    await initSession({ userId: userStore.user?.id })
    if (session.value) {
      chatStore.setSessionId(session.value.id)
      scrollToBottom()
    }
  }
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
  input.value = '' // Сброс input для повторного выбора того же файла

  // Проверка размера
  if (file.size > MAX_FILE_SIZE) {
    alert('Размер файла не должен превышать 10 МБ')
    return
  }

  pendingFile.value = file
  // Создаём preview только для изображений
  pendingPreview.value = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
}

// Удалить выбранный файл
function removePendingFile() {
  pendingFile.value = null
  if (pendingPreview.value) {
    URL.revokeObjectURL(pendingPreview.value) // Освобождаем память
    pendingPreview.value = null
  }
}

// Определение типа отправителя
const msgIsUser = (msg: ChatMessage) => msg.sender_type === 'user'
const msgIsOperator = (msg: ChatMessage) => msg.sender_type === 'admin' || msg.sender_type === 'bot'
const msgIsSystem = (msg: ChatMessage) => msg.sender_type === 'system'

// Проверка типа вложения
const msgIsImage = (msg: ChatMessage) => msg.content_type === 'image'
const msgIsFile = (msg: ChatMessage) => msg.content_type === 'file'
const msgHasAttachment = (msg: ChatMessage) => !!msg.attachment_url

// Форматирование времени сообщения (ЧЧ:ММ)
function formatMsgTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

// Имя отправителя для отображения
function getMsgSenderLabel(msg: ChatMessage): string {
  if (msgIsOperator(msg)) return msg.sender_name || 'Оператор'
  if (msgIsSystem(msg)) return 'Система'
  return 'Вы'
}

// Отправка сообщения в чате
async function handleSendMessage() {
  // Проверяем что есть текст или файл
  if ((!messageText.value.trim() && !pendingFile.value) || isSending.value || isUploading.value) return

  const text = messageText.value
  const file = pendingFile.value

  // Очищаем поля сразу (optimistic UI)
  messageText.value = ''
  removePendingFile()

  try {
    // Загружаем файл если есть
    let attachment
    if (file) {
      attachment = await uploadFile(file)
    }

    await sendMessage(text, attachment)
    chatStore.clearUnread()

    // Показываем typing с небольшой задержкой (имитация ответа)
    setTimeout(() => {
      isOperatorTyping.value = true
    }, 300)
  } catch {
    // При ошибке восстанавливаем текст
    messageText.value = text
  }
}

// Отправка по Enter (Shift+Enter — перенос строки)
function handleChatKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSendMessage()
  }
}

// Переключение FAQ аккордеона
function toggleFaq(id: number) {
  expandedFaq.value = expandedFaq.value === id ? null : id
}

// =============================================================================
// LIFECYCLE
// =============================================================================

// Инициализация чата при загрузке страницы (если чат — активная вкладка)
onMounted(() => {
  if (activeTab.value === 'chat') {
    initChatSession()
  }
})

// =============================================================================
// WATCHERS
// =============================================================================

// Скрываем typing когда пришёл ответ от бота/оператора
watch(lastMessage, (newMsg) => {
  if (!newMsg) return
  if (newMsg.sender_type === 'bot' || newMsg.sender_type === 'admin') {
    isOperatorTyping.value = false
  }
})

// Инициализация чата при переключении на вкладку
watch(activeTab, async (tab) => {
  if (tab === 'chat') {
    initChatSession()
  }
})

// Автоскролл при новых сообщениях
watch(messages, scrollToBottom, { deep: true })

// Автоскролл при появлении typing indicator
watch(isOperatorTyping, (typing) => {
  if (typing) scrollToBottom()
})
</script>

<template>
  <div
    class="space-y-6"
    :class="activeTab === 'chat' ? 'flex flex-col min-h-0 h-[calc(100dvh-12rem)] md:!block md:!h-auto' : ''"
  >
    <!-- На мобилке при вкладке «Чат» — блок заголовка и табов не сжимается -->
    <div :class="activeTab === 'chat' ? 'flex-shrink-0 space-y-4' : 'contents'">
      <!-- Page Header -->
      <header class="pb-1">
        <h1 class="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Поддержка</h1>
        <p class="text-sm text-[var(--text-muted)] mt-2">Задайте вопрос или найдите ответ</p>
      </header>

      <!-- Tabs — сегмент-контрол -->
      <div class="inline-flex rounded-xl border p-1 w-full sm:w-auto overflow-x-auto" style="background: var(--glass-bg); border-color: var(--glass-border);" role="tablist">
        <button
          @click="activeTab = 'chat'"
          type="button"
          role="tab"
          class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 whitespace-nowrap"
          :class="activeTab === 'chat' ? 'bg-primary text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
        >
          <Icon name="heroicons:chat-bubble-left-right" class="w-4 h-4" />
          Чат
          <span v-if="chatStore.unreadCount > 0" class="ml-0.5 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white min-w-[20px] text-center">
            {{ chatStore.unreadCount }}
          </span>
        </button>
        <button
          @click="activeTab = 'faq'"
          type="button"
          role="tab"
          class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 whitespace-nowrap"
          :class="activeTab === 'faq' ? 'bg-primary text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
        >
          <Icon name="heroicons:question-mark-circle" class="w-4 h-4" />
          FAQ
        </button>
      </div>
    </div>

    <!-- =====================================================================
         FAQ Tab — частые вопросы (аккордеон)
         ===================================================================== -->
    <div v-if="activeTab === 'faq'" class="space-y-4">
      <!-- Loading skeleton -->
      <div v-if="faqPending" class="space-y-4">
        <UiCard v-for="i in 5" :key="i" class="animate-pulse p-5">
          <div class="h-5 bg-[var(--glass-bg)] rounded w-3/4"></div>
        </UiCard>
      </div>

      <!-- FAQ List -->
      <template v-else>
        <UiCard
          v-for="item in faq"
          :key="item.id"
          class="p-0 overflow-hidden cursor-pointer"
          @click="toggleFaq(item.id)"
        >
          <div class="p-5">
            <!-- Вопрос -->
            <div class="flex items-center justify-between gap-4">
              <h3 class="font-medium text-[var(--text-primary)]">{{ item.question }}</h3>
              <Icon
                name="heroicons:chevron-down"
                class="w-5 h-5 text-[var(--text-muted)] transition-transform flex-shrink-0"
                :class="{ 'rotate-180': expandedFaq === item.id }"
              />
            </div>
            <!-- Ответ (раскрывается при клике) с мягкой анимацией -->
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              leave-active-class="transition-all duration-150 ease-in"
              enter-from-class="opacity-0 -translate-y-1"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <div
                v-if="expandedFaq === item.id"
                class="mt-3 pt-3 rounded-lg"
                style="border-top: 1px solid var(--glass-border);"
              >
                <p class="text-sm text-[var(--text-secondary)]">
                  {{ item.answer }}
                </p>
              </div>
            </Transition>
          </div>
        </UiCard>

        <!-- CTA — не нашли ответ -->
        <UiCard class="p-6 mt-6">
          <div class="text-center">
            <div class="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="heroicons:chat-bubble-left-right" class="w-8 h-8 text-primary" />
            </div>
            <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-2">Не нашли ответ?</h3>
            <p class="text-[var(--text-muted)] mb-4">Создайте заявку, и мы ответим в течение 15 минут</p>
            <UiButton @click="activeTab = 'chat'">
              <Icon name="heroicons:chat-bubble-left-right" class="w-5 h-5 mr-2" />
              Написать в чат
            </UiButton>
          </div>
        </UiCard>
      </template>
    </div>

    <!-- =====================================================================
         Chat Tab — realtime чат с поддержкой
         ===================================================================== -->
    <div
      v-if="activeTab === 'chat'"
      class="flex-1 min-h-0 flex flex-col md:flex-initial md:min-h-0 md:space-y-4"
    >
      <UiCard class="overflow-hidden flex-1 flex flex-col min-h-0 md:flex-initial md:min-h-0">
        <!-- Chat Header -->
        <div class="flex items-center gap-3 pb-4 border-b border-[var(--glass-border)] flex-shrink-0">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
            <Icon name="heroicons:chat-bubble-left-right" class="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 class="font-semibold text-[var(--text-primary)]">Чат с поддержкой</h3>
            <p class="text-xs text-[var(--text-muted)]">
              {{ session?.status === 'closed' ? 'Чат закрыт' : session ? 'Оператор онлайн' : 'Подключение...' }}
            </p>
          </div>
        </div>

        <!-- Chat Loading -->
        <div v-if="chatLoading" class="py-16 flex items-center justify-center">
          <Icon name="heroicons:arrow-path" class="w-8 h-8 text-primary animate-spin" />
        </div>

        <!-- Chat Content -->
        <template v-else>
          <div class="flex flex-col flex-1 min-h-0">
            <!-- Messages Area: на мобилке заполняет экран, на десктопе фикс. высота -->
            <div
              ref="messagesContainer"
              class="flex-1 min-h-0 overflow-y-auto py-4 space-y-3 md:flex-none md:h-[720px]"
            >
            <!-- Welcome message (если нет сообщений) -->
            <div v-if="messages.length === 0" class="text-center py-12">
              <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
                <Icon name="heroicons:sparkles" class="w-8 h-8 text-primary" />
              </div>
              <h4 class="font-semibold text-[var(--text-primary)] mb-2">Добро пожаловать!</h4>
              <p class="text-sm text-[var(--text-muted)]">
                Напишите ваш вопрос и наш оператор ответит вам
              </p>
            </div>

            <!-- Messages -->
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="flex gap-2"
              :class="msgIsUser(msg) ? 'flex-row-reverse' : 'flex-row'"
            >
              <!-- Аватар отправителя -->
              <div
                class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                :class="{
                  'bg-primary/20': msgIsUser(msg),
                  'bg-accent/20': msgIsOperator(msg),
                  'bg-white/10': msgIsSystem(msg)
                }"
              >
                <Icon
                  :name="msgIsUser(msg) ? 'heroicons:user' : msgIsOperator(msg) ? 'heroicons:user-circle' : 'heroicons:information-circle'"
                  class="w-4 h-4"
                  :class="{
                    'text-primary': msgIsUser(msg),
                    'text-accent': msgIsOperator(msg),
                    'text-[var(--text-muted)]': msgIsSystem(msg)
                  }"
                />
              </div>

              <!-- Блок сообщения -->
              <div
                class="max-w-[75%] rounded-2xl px-4 py-2"
                :class="{
                  'bg-primary text-white rounded-br-md': msgIsUser(msg),
                  'bg-white/10 text-[var(--text-primary)] rounded-bl-md': !msgIsUser(msg)
                }"
              >
                <!-- Имя отправителя (только для не-пользователя) -->
                <div
                  v-if="!msgIsUser(msg)"
                  class="text-xs font-medium mb-1"
                  :class="{
                    'text-accent': msgIsOperator(msg),
                    'text-[var(--text-muted)]': msgIsSystem(msg)
                  }"
                >
                  {{ getMsgSenderLabel(msg) }}
                </div>

                <!-- Текст сообщения -->
                <p v-if="msg.content" class="text-sm whitespace-pre-wrap break-words">
                  {{ msg.content }}
                </p>

                <!-- Вложение: изображение -->
                <div v-if="msgIsImage(msg) && msgHasAttachment(msg)" class="mt-2">
                  <a :href="msg.attachment_url!" target="_blank" class="block">
                    <img
                      :src="msg.attachment_url!"
                      :alt="msg.attachment_name || 'Изображение'"
                      class="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </a>
                </div>

                <!-- Вложение: файл -->
                <a
                  v-else-if="msgIsFile(msg) && msgHasAttachment(msg)"
                  :href="msg.attachment_url!"
                  target="_blank"
                  class="mt-2 flex items-center gap-2 p-2 rounded-lg transition-colors"
                  :class="msgIsUser(msg) ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 hover:bg-white/10'"
                >
                  <Icon name="heroicons:document" class="w-5 h-5 flex-shrink-0" :class="msgIsUser(msg) ? 'text-white/80' : 'text-primary'" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm truncate">{{ msg.attachment_name }}</p>
                    <p class="text-xs" :class="msgIsUser(msg) ? 'text-white/60' : 'text-[var(--text-muted)]'">
                      {{ formatFileSize(msg.attachment_size) }}
                    </p>
                  </div>
                  <Icon name="heroicons:arrow-down-tray" class="w-4 h-4 flex-shrink-0" :class="msgIsUser(msg) ? 'text-white/60' : 'text-[var(--text-muted)]'" />
                </a>

                <!-- Время отправки -->
                <div
                  class="text-[10px] mt-1"
                  :class="msgIsUser(msg) ? 'text-white/70 text-right' : 'text-[var(--text-muted)]'"
                >
                  {{ formatMsgTime(msg.created_at) }}
                </div>
              </div>
            </div>

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

            <!-- Input Area -->
            <div class="pt-4 border-t border-[var(--glass-border)] flex-shrink-0">
            <!-- Error message -->
            <div v-if="chatError" class="text-red-400 text-sm mb-2">{{ chatError }}</div>

            <!-- Pending file preview -->
            <div v-if="pendingFile" class="mb-3 p-2 rounded-lg flex items-center gap-2" style="background: var(--glass-bg);">
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

            <!-- Input row -->
            <div class="flex items-end gap-2">
              <!-- Attach button -->
              <button
                @click="openFileDialog"
                :disabled="isSending || isUploading"
                class="w-12 h-12 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10"
                style="background: var(--glass-bg);"
                title="Прикрепить файл"
              >
                <Icon name="heroicons:paper-clip" class="w-5 h-5 text-[var(--text-muted)]" />
              </button>

              <!-- Text input -->
              <textarea
                v-model="messageText"
                @keydown="handleChatKeydown"
                placeholder="Напишите сообщение..."
                rows="1"
                class="flex-1 px-4 py-3 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none max-h-32"
                style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
                :disabled="isSending || isUploading"
              ></textarea>

              <!-- Send button (как у Соседей: круглая, стрелка вверх) -->
              <button
                @click="handleSendMessage"
                :disabled="(!messageText.trim() && !pendingFile) || isSending || isUploading"
                class="w-11 h-11 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white flex items-center justify-center transition-colors"
                aria-label="Отправить"
                title="Отправить"
              >
                <Icon
                  :name="isSending || isUploading ? 'heroicons:arrow-path' : 'heroicons:arrow-up'"
                  class="w-5 h-5"
                  :class="{ 'animate-spin': isSending || isUploading }"
                />
              </button>
            </div>
            </div>
          </div>
        </template>
      </UiCard>
    </div>

  </div>
</template>
