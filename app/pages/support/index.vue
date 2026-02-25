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
import type { Bitrix24ChatMessage } from '~/types/bitrix24'
import { formatRelativeDate, formatFileSize } from '~/composables/useFormatters'

definePageMeta({
  middleware: 'auth'
})

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { fetchTickets, createTicket } = useTickets()
const { fetchFaq } = useFaq()

// =============================================================================
// DATA — загрузка тикетов и FAQ
// =============================================================================

const { tickets, pending: ticketsPending, error: ticketsError, refresh: refreshTickets } = await fetchTickets()
const { faq, pending: faqPending } = await fetchFaq()

// Bitrix24 чат через REST API
const {
  session,
  messages,
  isLoading: chatLoading,
  isSending,
  isUploading,
  error: chatError,
  initSession,
  uploadFile,
  sendMessage,
  startPolling,
  stopPolling
} = useBitrix24Chat()

// =============================================================================
// STATE — локальное состояние страницы
// =============================================================================

// Вкладки — определяем начальную из query параметра (?tab=faq)
const initialTab = (['faq', 'chat'].includes(route.query.tab as string)
  ? route.query.tab
  : 'chat') as 'faq' | 'chat'
const activeTab = ref<'faq' | 'chat'>(initialTab)

// Чат
const messageText = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const chatInitialized = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const pendingFile = ref<File | null>(null)
const pendingPreview = ref<string | null>(null)

const ACCEPT_FILES = 'image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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

// Удалено: больше не используем текущий чат

// Количество активных тикетов (для badge в табе)
const activeTicketsCount = computed(() => {
  return tickets.value.filter(t => t.status !== 'closed').length
})

// =============================================================================
// CONSTANTS
// =============================================================================

// Удалено: константы для файлов больше не нужны

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

// Функции для работы с чатом
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

async function initChatSession() {
  if (chatInitialized.value) return
  chatInitialized.value = true

  if (!session.value && userStore.isAuthenticated) {
    const userName = userStore.user?.firstName && userStore.user?.lastName
      ? `${userStore.user.firstName} ${userStore.user.lastName}`
      : userStore.user?.email || 'Пользователь'
    
    console.log('[Chat] Initializing Bitrix24 session for user:', userName)
    try {
      await initSession(userStore.user?.id, userName)
      const currentSession = session.value
      if (currentSession) {
        console.log('[Chat] Session created, ID:', (currentSession as any).id || 'unknown')
        scrollToBottom()
        startPolling(3000)
      } else {
        console.error('[Chat] Session not created - сессия не была создана!')
        // Выводим предупреждение в консоль
        const errorMsg = chatError.value || 'Не удалось создать сессию чата. Проверьте настройки CONFIG_ID и права webhook в Bitrix24.'
        console.warn('[Chat] ⚠️ Ошибка подключения к чату:', errorMsg)
      }
    } catch (error: any) {
      console.error('[Chat] Error initializing session:', error)
      const errorMsg = error?.data?.message || error?.message || 'Не удалось создать сессию чата'
      console.warn('[Chat] ⚠️ Ошибка подключения к чату:', errorMsg)
    }
  } else if (session.value) {
    // Если сессия уже есть, просто запускаем polling
    startPolling(3000)
  }
}

function openFileDialog() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''

  if (file.size > MAX_FILE_SIZE) {
    console.warn('[Chat] ⚠️ Размер файла не должен превышать 10 МБ')
    return
  }

  pendingFile.value = file
  pendingPreview.value = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
}

function removePendingFile() {
  pendingFile.value = null
  if (pendingPreview.value) {
    URL.revokeObjectURL(pendingPreview.value)
    pendingPreview.value = null
  }
}

async function handleSendMessage() {
  if ((!messageText.value.trim() && !pendingFile.value) || isSending.value) return

  const text = messageText.value
  const file = pendingFile.value

  messageText.value = ''
  const fileToSend = file
  removePendingFile()

  try {
    let attachment
    if (fileToSend) {
      attachment = await uploadFile(fileToSend)
    }

    await sendMessage(text || '', attachment)
    scrollToBottom()
  } catch (error: any) {
    console.error('[Chat] Error sending message:', error)
    // Выводим предупреждение в консоль
    const errorMessage = error?.data?.message || error?.message || 'Ошибка при отправке сообщения'
    console.warn('[Chat] ⚠️ Не удалось отправить сообщение:', errorMessage)
    
    messageText.value = text
    if (fileToSend) {
      pendingFile.value = fileToSend
      pendingPreview.value = fileToSend.type.startsWith('image/') ? URL.createObjectURL(fileToSend) : null
    }
  }
}

function handleChatKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSendMessage()
  }
}

// Определение типа отправителя
const msgIsUser = (msg: Bitrix24ChatMessage) => !msg.isOperator
const msgIsOperator = (msg: Bitrix24ChatMessage) => msg.isOperator
const msgHasAttachment = (msg: Bitrix24ChatMessage) => !!msg.attachments && msg.attachments.length > 0

// Форматирование времени сообщения (ЧЧ:ММ)
function formatMsgTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
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

// Инициализация при загрузке страницы
onMounted(async () => {
  updateIsMobile()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateIsMobile)
  }
  
  if (activeTab.value === 'chat') {
    preventBodyScroll(true)
    // Инициализируем чат при монтировании, если вкладка уже активна
    await initChatSession()
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

// Управление скроллом при переключении вкладок
watch(activeTab, async (tab) => {
  if (tab === 'chat') {
    preventBodyScroll(true)
    await initChatSession()
  } else {
    preventBodyScroll(false)
    stopPolling()
  }
})

// Автоскролл при новых сообщениях
watch(messages, () => {
  scrollToBottom()
}, { deep: true })
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
        <UiCard v-for="i in 5" :key="i" class="animate-pulse p-4">
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
          <div class="p-4">
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
        <UiCard class="p-4 mt-4 md:mt-6">
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
         Chat Tab — Bitrix24 чат через REST API
         ===================================================================== -->
    <div v-if="activeTab === 'chat'" class="flex flex-col md:h-[calc(100vh-280px)] min-h-[500px] fixed inset-x-0 top-[120px] bottom-20 md:relative md:inset-x-auto md:bottom-auto md:top-0">
      <div class="flex flex-col flex-1 h-full rounded-xl overflow-hidden" style="background: var(--bg-surface); border: 1px solid var(--glass-border);">
        <!-- Chat Header -->
        <div class="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style="border-color: var(--glass-border);">
          <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background: var(--glass-bg);">
            <Icon name="heroicons:chat-bubble-left-right" class="w-4 h-4 text-primary" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold text-[var(--text-primary)]">Чат с поддержкой</h3>
            <p class="text-xs truncate" :class="chatError ? 'text-red-400' : 'text-[var(--text-muted)]'">
              <span v-if="chatError">{{ chatError }}</span>
              <span v-else-if="chatLoading">Подключение...</span>
              <span v-else-if="session?.status === 'closed'">Чат закрыт</span>
              <span v-else-if="session">Оператор онлайн</span>
              <span v-else>Подключение...</span>
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
              class="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0"
              style="background: #f5f5f5;"
            >
              <!-- Welcome message -->
              <div v-if="messages.length === 0" class="text-center py-8 px-4">
                <h4 class="text-base font-medium text-gray-800 mb-2">Мы онлайн</h4>
                <p class="text-sm text-gray-600 mb-6">и готовы вам помочь!</p>
                
                <!-- Аватары операторов -->
                <div class="flex items-center justify-center gap-4 mb-6">
                  <div class="flex flex-col items-center">
                    <div class="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center mb-2">
                      <Icon name="heroicons:user" class="w-6 h-6 text-gray-600" />
                    </div>
                    <span class="text-xs text-gray-600">Валентин</span>
                  </div>
                  <div class="flex flex-col items-center">
                    <div class="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center mb-2">
                      <Icon name="heroicons:user" class="w-6 h-6 text-gray-600" />
                    </div>
                    <span class="text-xs text-gray-600">Богдан</span>
                  </div>
                </div>
              </div>

              <!-- Messages -->
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="flex gap-3"
                :class="msgIsUser(msg) ? 'flex-row-reverse' : 'flex-row'"
              >
                <!-- Аватар -->
                <div
                  class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
                  :class="{
                    'bg-blue-500': msgIsUser(msg),
                    'bg-gray-300': msgIsOperator(msg)
                  }"
                >
                  <Icon
                    :name="msgIsUser(msg) ? 'heroicons:user' : 'heroicons:user-circle'"
                    class="w-6 h-6"
                    :class="{
                      'text-white': msgIsUser(msg),
                      'text-gray-600': msgIsOperator(msg)
                    }"
                  />
                </div>

                <!-- Блок сообщения -->
                <div
                  class="max-w-[70%] rounded-lg px-4 py-2.5 shadow-sm"
                  :class="{
                    'bg-blue-500 text-white': msgIsUser(msg),
                    'bg-white text-gray-800 border border-gray-200': !msgIsUser(msg)
                  }"
                >
                  <!-- Имя отправителя (только для оператора) -->
                  <div
                    v-if="!msgIsUser(msg)"
                    class="text-xs font-semibold mb-1 text-gray-600"
                  >
                    {{ msg.authorName }}
                  </div>

                  <!-- Текст сообщения -->
                  <p v-if="msg.text" class="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {{ msg.text }}
                  </p>

                  <!-- Вложения -->
                  <template v-if="msgHasAttachment(msg)">
                    <div v-for="attachment in msg.attachments" :key="attachment.id" class="mt-2">
                      <!-- Изображение -->
                      <a v-if="attachment.type === 'image'" :href="attachment.url" target="_blank" class="block rounded-lg overflow-hidden">
                        <img
                          :src="attachment.url"
                          :alt="attachment.name"
                          class="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      </a>
                      <!-- Файл -->
                      <a
                        v-else
                        :href="attachment.url"
                        target="_blank"
                        class="flex items-center gap-3 p-3 rounded-lg transition-colors border"
                        :class="msgIsUser(msg) 
                          ? 'bg-blue-400 border-blue-400 hover:bg-blue-300 text-white' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-800'"
                      >
                        <Icon name="heroicons:document" class="w-5 h-5 flex-shrink-0" :class="msgIsUser(msg) ? 'text-white' : 'text-gray-600'" />
                        <div class="flex-1 min-w-0">
                          <p class="text-sm truncate font-medium">{{ attachment.name }}</p>
                          <p class="text-xs" :class="msgIsUser(msg) ? 'text-blue-100' : 'text-gray-500'">
                            {{ formatFileSize(attachment.size) }}
                          </p>
                        </div>
                        <Icon name="heroicons:arrow-down-tray" class="w-4 h-4 flex-shrink-0" :class="msgIsUser(msg) ? 'text-blue-100' : 'text-gray-500'" />
                      </a>
                    </div>
                  </template>

                  <!-- Время отправки -->
                  <div
                    class="text-[11px] mt-1.5"
                    :class="msgIsUser(msg) ? 'text-blue-100 text-right' : 'text-gray-400'"
                  >
                    {{ formatMsgTime(msg.createdAt) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Input Area -->
            <div class="px-4 py-3 border-t flex-shrink-0 bg-white">
              <!-- Error message -->
              <div v-if="chatError" class="text-red-500 text-sm mb-2 px-2">{{ chatError }}</div>

              <!-- Pending file preview -->
              <div v-if="pendingFile" class="mb-3 p-3 rounded-lg flex items-center gap-3 bg-gray-50 border border-gray-200">
                <img
                  v-if="pendingPreview"
                  :src="pendingPreview"
                  class="w-12 h-12 rounded object-cover flex-shrink-0"
                />
                <div v-else class="w-12 h-12 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Icon name="heroicons:document" class="w-6 h-6 text-blue-600" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm truncate text-gray-800 font-medium">{{ pendingFile.name }}</p>
                  <p class="text-xs text-gray-500">{{ formatFileSize(pendingFile.size) }}</p>
                </div>
                <button
                  @click="removePendingFile"
                  class="p-1.5 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
                >
                  <Icon name="heroicons:x-mark" class="w-4 h-4 text-gray-600" />
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
                  class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-gray-600"
                  title="Прикрепить файл"
                >
                  <Icon name="heroicons:paper-clip" class="w-5 h-5" />
                </button>

                <!-- Emoji button -->
                <button
                  :disabled="isSending || isUploading"
                  class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-gray-600"
                  title="Эмодзи"
                >
                  <Icon name="heroicons:face-smile" class="w-5 h-5" />
                </button>

                <!-- Text input -->
                <textarea
                  v-model="messageText"
                  @keydown="handleChatKeydown"
                  placeholder="Введите сообщение..."
                  rows="1"
                  class="flex-1 px-4 py-2.5 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none max-h-32 bg-white border border-gray-200"
                  :disabled="isSending || isUploading"
                ></textarea>

                <!-- Send button -->
                <button
                  @click="handleSendMessage"
                  :disabled="(!messageText.trim() && !pendingFile) || isSending || isUploading"
                  class="w-9 h-9 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all"
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
