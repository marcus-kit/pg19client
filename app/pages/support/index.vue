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
import { formatRelativeDate } from '~/composables/useFormatters'

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

// Bitrix24 чат — используем iframe вместо текущего чата

// =============================================================================
// STATE — локальное состояние страницы
// =============================================================================

// Вкладки — определяем начальную из query параметра (?tab=faq)
const initialTab = (['faq', 'chat'].includes(route.query.tab as string)
  ? route.query.tab
  : 'chat') as 'faq' | 'chat'
const activeTab = ref<'faq' | 'chat'>(initialTab)

// Bitrix24 чат URL
const bitrix24ChatUrl = 'https://pg19.bitrix24.ru/online/testbot2'

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

// Удалено: вся логика текущего чата заменена на Bitrix24 iframe

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
onMounted(() => {
  updateIsMobile()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateIsMobile)
  }
  
  if (activeTab.value === 'chat') {
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

// Управление скроллом при переключении вкладок
watch(activeTab, (tab) => {
  if (tab === 'chat') {
    preventBodyScroll(true)
  } else {
    preventBodyScroll(false)
  }
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
         Chat Tab — Bitrix24 чат через iframe
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
            <p class="text-xs text-[var(--text-muted)] truncate">
              Онлайн консультация через Bitrix24
            </p>
          </div>
        </div>

        <!-- Bitrix24 Chat iframe -->
        <div class="flex-1 min-h-0 relative">
          <iframe
            :src="bitrix24ChatUrl"
            class="w-full h-full border-0"
            frameborder="0"
            allow="microphone; camera"
            title="Чат поддержки Bitrix24"
          ></iframe>
        </div>
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
