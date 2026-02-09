<script setup lang="ts">
/**
 * Страница поддержки — три вкладки:
 * 1. Чат — realtime чат с оператором/ботом (useChat composable)
 * 2. Заявки — список тикетов пользователя
 * 3. FAQ — частые вопросы (accordion)
 *
 * Особенности:
 * - Чат инициализируется лениво (только при открытии вкладки)
 * - Поддержка вложений в чате (изображения, документы)
 * - Модалка создания новой заявки
 */

import type { Ticket, TicketCategory } from '~/types/ticket'
import type { ChatMessage } from '~/types/chat'
import { formatFileSize, formatRelativeDate } from '~/composables/useFormatters'

definePageMeta({
  middleware: 'auth'
})

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const userStore = useUserStore()
const { fetchTickets, createTicket } = useTickets()
const { fetchFaq } = useFaq()

// =============================================================================
// DATA — загрузка тикетов и FAQ
// =============================================================================

const { tickets, pending: ticketsPending, error: ticketsError, refresh: refreshTickets } = await fetchTickets()
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

// Модалка создания заявки
const showNewTicketModal = ref(false)
const submitting = ref(false)
const newTicket = ref({
  category: '' as TicketCategory | '',
  subject: '',
  description: ''
})

// =============================================================================
// COMPUTED
// =============================================================================

// Отслеживаем последнее сообщение — скрываем typing когда пришёл ответ
const lastMessage = computed(() => messages.value[messages.value.length - 1])

// Количество активных тикетов (для badge в табе)
const activeTicketsCount = computed(() => {
  return tickets.value.filter(t => t.status !== 'closed').length
})

// =============================================================================
// CONSTANTS
// =============================================================================

const ACCEPT_FILES = 'image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Конфигурация статусов тикетов для UI (цвета и лейблы)
const statusConfig: Record<string, { label: string; variant: 'info' | 'warning' | 'success' | 'neutral'; color: string }> = {
  new: { label: 'Новая', variant: 'info', color: 'text-blue-400' },
  open: { label: 'В работе', variant: 'warning', color: 'text-yellow-400' },
  pending: { label: 'Ожидает ответа', variant: 'warning', color: 'text-orange-400' },
  resolved: { label: 'Решена', variant: 'success', color: 'text-accent' },
  closed: { label: 'Закрыта', variant: 'neutral', color: 'text-[var(--text-muted)]' }
}

// Категории заявок
const categories = [
  { value: 'technical', label: 'Техническая проблема' },
  { value: 'billing', label: 'Вопрос по оплате' },
  { value: 'tariff', label: 'Смена тарифа' },
  { value: 'connection', label: 'Подключение' },
  { value: 'equipment', label: 'Оборудование' },
  { value: 'other', label: 'Другое' }
]

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
          chatStore.setSessionId((session.value as { id: string }).id)
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
        chatStore.setSessionId((session.value as { id: string }).id)
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

// Отправка новой заявки
async function submitTicket() {
  if (!newTicket.value.subject.trim() || !newTicket.value.description.trim()) return

  submitting.value = true
  try {
    const { ticket, error } = await createTicket({
      subject: newTicket.value.subject,
      description: newTicket.value.description,
      category: (newTicket.value.category || 'other') as TicketCategory
    })

    if (error) {
      console.error('Error creating ticket:', error)
      return
    }

    // Закрываем модалку и очищаем форму
    showNewTicketModal.value = false
    newTicket.value = { category: '', subject: '', description: '' }

    // Редирект на страницу созданного тикета
    if (ticket) {
      router.push(`/support/${ticket.id}`)
    }
  } finally {
    submitting.value = false
  }
}

// =============================================================================
// LIFECYCLE
// =============================================================================

// Предотвращение скролла страницы на мобильных при открытом чате
const isMobile = ref(false)

function updateIsMobile() {
  if (typeof window === 'undefined') return
  isMobile.value = window.innerWidth < 768
}

function preventBodyScroll(prevent: boolean) {
  if (typeof document === 'undefined') return
  if (prevent && isMobile.value) {
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
  } else {
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.width = ''
  }
}

// Инициализация чата при загрузке страницы (если чат — активная вкладка)
onMounted(() => {
  updateIsMobile()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateIsMobile)
  }
  
  if (activeTab.value === 'chat') {
    initChatSession()
    preventBodyScroll(true)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateIsMobile)
  }
  preventBodyScroll(false)
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
    if (!chatInitialized.value) {
      await initChatSession()
    }
    preventBodyScroll(true)
  } else {
    preventBodyScroll(false)
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
  <div class="space-y-4 md:space-y-6">
    <!-- =====================================================================
         Page Header
         ===================================================================== -->
    <div>
      <h1 class="text-xl md:text-2xl font-bold text-[var(--text-primary)]">Поддержка</h1>
    </div>

    <!-- =====================================================================
         Action Bar — иконки чата, FAQ и создания заявки на одном уровне (mobile)
         ===================================================================== -->
    <div 
      class="md:hidden flex items-center gap-2"
      :class="{
        'fixed top-16 left-0 right-0 px-4 py-2 z-50': activeTab === 'chat' && isMobile
      }"
      :style="activeTab === 'chat' && isMobile ? 'background: var(--bg-base);' : ''"
    >
      <!-- Чат -->
      <button
        @click="activeTab = 'chat'"
        class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-colors relative"
        :class="activeTab === 'chat'
          ? 'bg-primary text-white'
          : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
        title="Чат с поддержкой"
      >
        <Icon name="heroicons:chat-bubble-left-right" class="w-4 h-4 flex-shrink-0" />
        <!-- Badge непрочитанных сообщений -->
        <span v-if="chatStore.unreadCount > 0" class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
          {{ chatStore.unreadCount > 9 ? '9+' : chatStore.unreadCount }}
        </span>
      </button>

      <!-- FAQ -->
      <button
        @click="activeTab = 'faq'"
        class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-colors"
        :class="activeTab === 'faq'
          ? 'bg-primary text-white'
          : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
        title="Частые вопросы"
      >
        <Icon name="heroicons:question-mark-circle" class="w-4 h-4 flex-shrink-0" />
      </button>

      <!-- Создать заявку -->
      <button
        @click="showNewTicketModal = true"
        class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-colors bg-[var(--glass-bg)] text-[var(--text-primary)] hover:text-primary ml-auto"
        title="Создать заявку"
      >
        <span class="text-sm font-medium">Создать заявку</span>
        <Icon name="heroicons:plus" class="w-4 h-4 flex-shrink-0" />
      </button>
    </div>

    <!-- =====================================================================
         Tabs — переключение между чатом и FAQ (desktop, как было изначально)
         ===================================================================== -->
    <div class="hidden md:flex items-center gap-2 justify-between">
      <div class="flex gap-2">
        <!-- Чат -->
        <button
          @click="activeTab = 'chat'"
          class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors relative"
          :class="activeTab === 'chat'
            ? 'bg-primary text-white'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
          :style="activeTab !== 'chat' ? 'background: var(--glass-bg);' : ''"
        >
          <Icon name="heroicons:chat-bubble-left-right" class="w-5 h-5 flex-shrink-0" />
          <span>Чат с поддержкой</span>
          <!-- Badge непрочитанных сообщений -->
          <span v-if="chatStore.unreadCount > 0" class="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
            {{ chatStore.unreadCount }}
          </span>
        </button>

        <!-- FAQ -->
        <button
          @click="activeTab = 'faq'"
          class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          :class="activeTab === 'faq'
            ? 'bg-primary text-white'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
          :style="activeTab !== 'faq' ? 'background: var(--glass-bg);' : ''"
        >
          <Icon name="heroicons:question-mark-circle" class="w-5 h-5 flex-shrink-0" />
          <span>Частые вопросы</span>
        </button>
      </div>

      <!-- Создать заявку (desktop) -->
      <button
        @click="showNewTicketModal = true"
        class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-colors bg-[var(--glass-bg)] text-[var(--text-primary)] hover:text-primary"
      >
        <span class="text-sm font-medium">Создать заявку</span>
        <Icon name="heroicons:plus" class="w-4 h-4 flex-shrink-0" />
      </button>
    </div>

    <!-- =====================================================================
         FAQ Tab — частые вопросы (аккордеон)
         ===================================================================== -->
    <div v-if="activeTab === 'faq'" class="space-y-2 md:space-y-3">
      <!-- Loading skeleton -->
      <div v-if="faqPending" class="space-y-2 md:space-y-3">
        <UiCard v-for="i in 5" :key="i" class="animate-pulse p-3 md:p-5">
          <div class="h-4 md:h-5 bg-[var(--glass-bg)] rounded w-3/4"></div>
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
          <div class="p-3 md:p-5">
            <!-- Вопрос -->
            <div class="flex items-center justify-between gap-4">
              <h3 class="text-sm md:text-base font-medium text-[var(--text-primary)]">{{ item.question }}</h3>
              <Icon
                name="heroicons:chevron-down"
                class="w-4 h-4 md:w-5 md:h-5 text-[var(--text-muted)] transition-transform flex-shrink-0"
                :class="{ 'rotate-180': expandedFaq === item.id }"
              />
            </div>
            <!-- Ответ (раскрывается при клике) -->
            <div
              v-show="expandedFaq === item.id"
              class="mt-2 md:mt-3 pt-2 md:pt-3"
              style="border-top: 1px solid var(--glass-border);"
            >
              <p class="text-sm md:text-sm text-[var(--text-secondary)]">{{ item.answer }}</p>
            </div>
          </div>
        </UiCard>

        <!-- CTA — не нашли ответ -->
        <UiCard class="p-4 md:p-6 mt-4 md:mt-6">
          <div class="text-center">
            <div class="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center mx-auto mb-3 md:mb-4">
              <Icon name="heroicons:chat-bubble-left-right" class="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <h3 class="text-base md:text-lg font-semibold text-[var(--text-primary)] mb-1 md:mb-2">Не нашли ответ?</h3>
            <p class="text-xs md:text-base text-[var(--text-muted)] mb-3 md:mb-4">Создайте заявку, и мы ответим в течение 15 минут</p>
            <UiButton size="sm" @click="showNewTicketModal = true">
              <Icon name="heroicons:pencil-square" class="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Создать заявку
            </UiButton>
          </div>
        </UiCard>
      </template>
    </div>

    <!-- =====================================================================
         Chat Tab — realtime чат с поддержкой
         ===================================================================== -->
    <div v-if="activeTab === 'chat'" class="flex flex-col md:h-[calc(100vh-280px)] min-h-[500px] fixed inset-x-0 top-[120px] bottom-20 md:relative md:inset-x-auto md:bottom-auto md:top-0">
      <div class="flex flex-col flex-1 h-full" style="background: var(--bg-surface);">
        <!-- Chat Header -->
        <div class="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style="border-color: var(--glass-border);">
          <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background: var(--glass-bg);">
            <Icon name="heroicons:chat-bubble-left-right" class="w-4 h-4 text-primary" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold text-[var(--text-primary)]">Чат с поддержкой</h3>
            <p class="text-xs text-[var(--text-muted)] truncate">
              {{ session?.status === 'closed' ? 'Чат закрыт' : session ? 'Оператор онлайн' : 'Подключение...' }}
            </p>
          </div>
        </div>

        <!-- Chat Loading -->
        <div v-if="chatLoading" class="flex-1 flex items-center justify-center">
          <Icon name="heroicons:arrow-path" class="w-8 h-8 text-primary animate-spin" />
        </div>

        <!-- Chat Content -->
        <template v-else>
          <div class="flex flex-col flex-1 min-h-0">
            <!-- Messages Area -->
            <div
              ref="messagesContainer"
              class="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0 custom-scrollbar"
            >
            <!-- Welcome message (если нет сообщений) -->
            <div v-if="messages.length === 0" class="text-center py-12">
              <div class="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style="background: var(--glass-bg);">
                <Icon name="heroicons:chat-bubble-left-right" class="w-6 h-6 text-primary" />
              </div>
              <h4 class="text-sm font-semibold text-[var(--text-primary)] mb-1">Добро пожаловать!</h4>
              <p class="text-xs text-[var(--text-muted)]">
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
                class="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                :class="{
                  'bg-primary/20': msgIsUser(msg),
                  'bg-accent/20': msgIsOperator(msg),
                  'bg-white/5': msgIsSystem(msg)
                }"
              >
                <Icon
                  :name="msgIsUser(msg) ? 'heroicons:user' : msgIsOperator(msg) ? 'heroicons:user-circle' : 'heroicons:information-circle'"
                  class="w-3.5 h-3.5"
                  :class="{
                    'text-primary': msgIsUser(msg),
                    'text-accent': msgIsOperator(msg),
                    'text-[var(--text-muted)]': msgIsSystem(msg)
                  }"
                />
              </div>

              <!-- Блок сообщения -->
              <div
                class="max-w-[75%] rounded-xl px-3 py-2"
                :class="{
                  'bg-primary text-white': msgIsUser(msg),
                  'bg-[var(--glass-bg)] text-[var(--text-primary)]': !msgIsUser(msg)
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
              <div class="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-accent/20">
                <Icon name="heroicons:user-circle" class="w-3.5 h-3.5 text-accent" />
              </div>
              <div class="bg-[var(--glass-bg)] rounded-xl px-3 py-2">
                <div class="flex items-center gap-1">
                  <span class="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                  <span class="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                  <span class="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style="animation-delay: 300ms"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="px-4 py-3 border-t flex-shrink-0" style="border-color: var(--glass-border);">
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
                class="w-10 h-10 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5"
                style="background: var(--glass-bg);"
                title="Прикрепить файл"
              >
                <Icon name="heroicons:paper-clip" class="w-4 h-4 text-[var(--text-muted)]" />
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

              <!-- Send button -->
              <button
                @click="handleSendMessage"
                :disabled="(!messageText.trim() && !pendingFile) || isSending || isUploading"
                class="w-10 h-10 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all"
              >
                <Icon
                  :name="isSending || isUploading ? 'heroicons:arrow-path' : 'heroicons:paper-airplane'"
                  class="w-4 h-4"
                  :class="{ 'animate-spin': isSending || isUploading }"
                />
              </button>
            </div>
          </div>
          </div>
        </template>
      </div>
    </div>

    <!-- =====================================================================
         New Ticket Modal — модалка создания заявки
         ===================================================================== -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showNewTicketModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background-color: var(--modal-backdrop);"
          @click.self="showNewTicketModal = false"
        >
          <div class="w-full max-w-lg rounded-2xl p-6" style="background: var(--bg-surface); border: 1px solid var(--glass-border);">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-[var(--text-primary)]">Новая заявка</h3>
              <button
                class="p-1 rounded-lg hover:bg-[var(--glass-bg)] transition-colors"
                @click="showNewTicketModal = false"
              >
                <Icon name="heroicons:x-mark" class="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>

            <!-- Form -->
            <form class="space-y-4" @submit.prevent="submitTicket">
              <!-- Категория -->
              <UiSelect
                v-model="newTicket.category"
                :options="categories"
                label="Категория"
                placeholder="Выберите категорию"
              />

              <!-- Тема -->
              <div>
                <label class="block text-sm text-[var(--text-muted)] mb-2">Тема</label>
                <input
                  v-model="newTicket.subject"
                  type="text"
                  class="w-full px-4 py-3 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
                  placeholder="Кратко опишите проблему"
                  required
                />
              </div>

              <!-- Описание -->
              <div>
                <label class="block text-sm text-[var(--text-muted)] mb-2">Сообщение</label>
                <textarea
                  v-model="newTicket.description"
                  rows="4"
                  class="w-full px-4 py-3 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                  style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
                  placeholder="Подробно опишите вашу проблему или вопрос..."
                  required
                />
              </div>

              <!-- Actions -->
              <div class="flex gap-3 pt-2">
                <UiButton
                  type="button"
                  variant="secondary"
                  class="flex-1"
                  @click="showNewTicketModal = false"
                >
                  Отмена
                </UiButton>
                <UiButton type="submit" variant="primary" class="flex-1" :disabled="submitting">
                  <Icon v-if="submitting" name="heroicons:arrow-path" class="w-4 h-4 mr-2 animate-spin" />
                  <Icon v-else name="heroicons:paper-airplane" class="w-4 h-4 mr-2" />
                  {{ submitting ? 'Отправка...' : 'Отправить' }}
                </UiButton>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
