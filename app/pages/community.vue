<script setup lang="ts">
/**
 * Страница сообщества — соседский чат с комнатами по уровням:
 * - city — городской чат
 * - district — районный чат
 * - building — чат дома
 *
 * Особенности:
 * - Realtime сообщения через Supabase
 * - Закреплённые сообщения
 * - Модерация (mute, delete, pin)
 * - Infinite scroll для истории
 * - Typing indicator
 */
import type { CommunityRoom, CommunityMessage, CommunityReportReason, CommunityRoomLevel } from '~/types/community'

definePageMeta({
  middleware: 'auth'
})

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const userStore = useUserStore()
const {
  rooms,
  currentRoom,
  messages,
  pinnedMessages,
  isLoadingRooms,
  isLoadingMessages,
  isSending,
  hasMoreMessages,
  isMuted,
  mutedUntil,
  error,
  typingUsers,
  onlineCount,
  loadRooms,
  selectRoom,
  loadMore,
  sendMessage,
  retryMessage,
  uploadImage,
  togglePin,
  deleteMessage,
  isModerator,
  isUserModerator,
  muteUser,
  reportMessage,
  broadcastTyping
} = useCommunityChat()

// =============================================================================
// STATE — локальное состояние
// =============================================================================

// Контейнер сообщений (для автоскролла)
const messagesContainer = ref<HTMLElement>()

// Ответ на сообщение
const replyTo = ref<CommunityMessage | null>(null)
const messageInputRef = ref<{ focus: () => void } | null>(null)

// Текущая видимая дата для sticky плашки
const visibleDate = ref<string | null>(null)
const messageRefs = ref<Map<number, HTMLElement>>(new Map())

// Контекстное меню (ПКМ на сообщении)
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  message: null as CommunityMessage | null
})

// =============================================================================
// MUTE MODAL — модалка блокировки пользователя
// =============================================================================

const showMuteModal = ref(false)
const muteTargetUserId = ref<number | null>(null)
const muteTargetUserName = ref('')

// =============================================================================
// REPORT MODAL — модалка жалобы на сообщение
// =============================================================================

const showReportModal = ref(false)
const reportTargetMessageId = ref<number | null>(null)

// =============================================================================
// COMPUTED
// =============================================================================

// Показывать ли кнопки модерации
const showModeration = computed(() => isModerator())

// Форматирование даты окончания мута
const mutedUntilFormatted = computed(() => {
  if (!mutedUntil.value) return null
  return new Date(mutedUntil.value).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
})

// Проверка, является ли дата сегодняшней
function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

// Форматирование даты с учетом года
function formatDate(date: Date): string {
  const today = new Date()
  const currentYear = today.getFullYear()
  const messageYear = date.getFullYear()

  // Если год текущий - не показываем год
  if (messageYear === currentYear) {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long'
    })
  }

  // Если год прошлый или будущий - показываем год
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// Получить разделитель даты для сообщения
function getDateSeparator(message: CommunityMessage, index: number): string | null {
  // Для первого сообщения всегда показывать
  if (index === 0) {
    const msgDate = new Date(message.createdAt)
    if (isToday(msgDate)) {
      return 'Сегодня'
    }
    return formatDate(msgDate)
  }

  // Для остальных - проверяем, отличается ли дата от предыдущего сообщения
  const prevMessage = messages.value[index - 1]
  if (!prevMessage) return null

  const msgDate = new Date(message.createdAt)
  const prevDate = new Date(prevMessage.createdAt)

  // Проверяем, что даты разные (без учета времени)
  const msgDateOnly = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate())
  const prevDateOnly = new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate())

  if (msgDateOnly.getTime() !== prevDateOnly.getTime()) {
    if (isToday(msgDate)) {
      return 'Сегодня'
    }
    return formatDate(msgDate)
  }

  return null
}

// Получить дату для сообщения (для sticky плашки)
function getMessageDate(message: CommunityMessage): string {
  const msgDate = new Date(message.createdAt)
  if (isToday(msgDate)) {
    return 'Сегодня'
  }
  return formatDate(msgDate)
}

// =============================================================================
// INTERSECTION OBSERVER — отслеживание видимых разделителей дат
// =============================================================================

let intersectionObserver: IntersectionObserver | null = null

function setupDateObserver(): void {
  if (!messagesContainer.value) return

  // Удаляем старый observer, если есть
  if (intersectionObserver) {
    intersectionObserver.disconnect()
  }

  // Создаем новый observer
  intersectionObserver = new IntersectionObserver(
    (entries) => {
      // Находим первое видимое сообщение (самое верхнее)
      const visibleEntries = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => {
          const aRect = a.boundingClientRect
          const bRect = b.boundingClientRect
          return aRect.top - bRect.top
        })

      if (visibleEntries.length > 0 && visibleEntries[0]) {
        const firstVisible = visibleEntries[0]
        const messageIndex = Number(firstVisible.target.getAttribute('data-message-index'))
        if (!isNaN(messageIndex) && messages.value[messageIndex]) {
          visibleDate.value = getMessageDate(messages.value[messageIndex])
        }
      }
    },
    {
      root: messagesContainer.value,
      rootMargin: '-80px 0px 0px 0px', // Учитываем sticky плашку
      threshold: 0.1
    }
  )

  // Наблюдаем за всеми сообщениями
  nextTick(() => {
    messageRefs.value.forEach((el, index) => {
      if (el) {
        intersectionObserver?.observe(el)
      }
    })
  })
}

// =============================================================================
// METHODS — обработчики событий
// =============================================================================

// Иконка уровня комнаты
function levelIcon(level: CommunityRoomLevel): string {
  switch (level) {
    case 'city': return 'heroicons:building-office-2'
    case 'district': return 'heroicons:map'
    case 'building': return 'heroicons:home'
    default: return 'heroicons:chat-bubble-left-right'
  }
}

// Отправка сообщения
async function handleSend(content: string, options?: { replyToId?: number }): Promise<void> {
  await sendMessage(content, options)
}

// Загрузка и отправка изображения
async function handleUpload(file: File): Promise<void> {
  const { url, width, height } = await uploadImage(file)
  await sendMessage('', { imageUrl: url, imageWidth: width, imageHeight: height })
}

// Закрепить/открепить сообщение
async function handlePin(messageId: number): Promise<void> {
  await togglePin(messageId)
}

// Удалить сообщение (с подтверждением)
async function handleDelete(messageId: number): Promise<void> {
  if (confirm('Удалить это сообщение?')) {
    await deleteMessage(messageId)
  }
}

// Повторить отправку неудавшегося сообщения
async function handleRetry(tempId: string): Promise<void> {
  await retryMessage(tempId)
}

// Выбрать комнату
async function handleRoomSelect(room: CommunityRoom): Promise<void> {
  await selectRoom(room)
}

// =============================================================================
// Контекстное меню
// =============================================================================

// Открыть контекстное меню на сообщении
function handleContextMenu(event: MouseEvent, message: CommunityMessage): void {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    message
  }
}

// Закрыть контекстное меню
function closeContextMenu(): void {
  contextMenu.value.show = false
}

// Ответить на сообщение из контекстного меню
function handleContextReply(): void {
  if (contextMenu.value.message) {
    replyTo.value = contextMenu.value.message
    nextTick(() => {
      messageInputRef.value?.focus()
    })
  }
}

// Закрепить из контекстного меню
function handleContextPin(): void {
  if (contextMenu.value.message) {
    handlePin(contextMenu.value.message.id as number)
  }
}

// Удалить из контекстного меню
function handleContextDelete(): void {
  if (contextMenu.value.message) {
    handleDelete(contextMenu.value.message.id as number)
  }
}

// =============================================================================
// Mute Modal
// =============================================================================

// Открыть модалку блокировки
function handleMuteClick(userId: number): void {
  const msg = messages.value.find(m => m.userId === userId)
  muteTargetUserName.value = msg?.user?.nickname || msg?.user?.firstName || 'Пользователь'
  muteTargetUserId.value = userId
  showMuteModal.value = true
}

// Отправить блокировку
async function handleMuteSubmit(data: { userId: number; duration: number; reason: string }): Promise<void> {
  try {
    await muteUser(data.userId, data.duration, data.reason || undefined)
    showMuteModal.value = false
    muteTargetUserId.value = null
  } catch {
    // Ошибка обрабатывается в composable
  }
}

// =============================================================================
// Report Modal
// =============================================================================

// Открыть модалку жалобы
function handleReportClick(messageId: number): void {
  reportTargetMessageId.value = messageId
  showReportModal.value = true
}

// Отправить жалобу
async function handleReportSubmit(data: { messageId: number; reason: CommunityReportReason; details: string }): Promise<void> {
  try {
    await reportMessage(data.messageId, data.reason, data.details || undefined)
    showReportModal.value = false
    reportTargetMessageId.value = null
  } catch {
    // Ошибка обрабатывается в composable
  }
}

// =============================================================================
// Infinite Scroll
// =============================================================================

// Подгрузка истории при скролле вверх
function handleScroll(e: Event): void {
  const el = e.target as HTMLElement
  if (el.scrollTop < 100 && hasMoreMessages.value && !isLoadingMessages.value) {
    loadMore()
  }
}

// =============================================================================
// HEAD — отключение скролла на body
// =============================================================================

useHead({
  bodyAttrs: {
    class: 'overflow-hidden'
  }
})

// =============================================================================
// LIFECYCLE
// =============================================================================

// Загрузка комнат и автовыбор при монтировании
onMounted(async () => {
  await loadRooms()

  // Автовыбор комнаты дома (или первой доступной)
  if (rooms.value.length > 0) {
    const buildingRoom = rooms.value.find(r => r.level === 'building')
    await selectRoom(buildingRoom || rooms.value[0])
  }

  // Настраиваем observer для отслеживания видимых дат
  nextTick(() => {
    setupDateObserver()
    // Устанавливаем начальную дату (последнее сообщение)
    if (messages.value.length > 0) {
      visibleDate.value = getMessageDate(messages.value[messages.value.length - 1])
    }
  })
})

// Очистка observer и overflow-hidden при размонтировании
onUnmounted(() => {
  if (intersectionObserver) {
    intersectionObserver.disconnect()
  }
  document.body.classList.remove('overflow-hidden')
})

// =============================================================================
// WATCHERS
// =============================================================================

// Автоскролл при новых сообщениях и настройка observer
watch(messages, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
    // Настраиваем observer при изменении сообщений
    setupDateObserver()
    // Обновляем видимую дату (последнее сообщение)
    if (messages.value.length > 0) {
      visibleDate.value = getMessageDate(messages.value[messages.value.length - 1])
    }
  })
}, { deep: true })
</script>

<template>
  <!-- =========================================================================
       COMMUNITY PAGE — полноэкранный чат сообщества
       Высота: 100vh минус header (64px) и mobile nav (80px), минус отступы layout (48px)
       ========================================================================= -->
  <div class="flex flex-col bg-[var(--bg-primary)] -mx-4 -my-6 overflow-hidden h-[calc(100vh-4rem-5rem)] md:h-[calc(100vh-4rem)]">

    <!-- =====================================================================
         HEADER — табы комнат и счётчик онлайн
         ===================================================================== -->
    <header class="flex-shrink-0 border-b border-white/10">
      <!-- Title row -->
      <div class="flex items-center justify-between px-4 py-2">
        <h2 class="font-bold text-[var(--text-primary)]">Сообщество</h2>
        <p class="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-accent animate-pulse" />
          {{ onlineCount }} онлайн
        </p>
      </div>

      <!-- Loading -->
      <div v-if="isLoadingRooms" class="flex items-center justify-center py-3">
        <Icon name="heroicons:arrow-path" class="w-5 h-5 text-primary animate-spin" />
      </div>

      <!-- Empty -->
      <div v-else-if="rooms.length === 0" class="text-center py-3 px-4">
        <p class="text-[var(--text-muted)] text-sm">Нет доступных чатов. Укажите адрес в профиле.</p>
      </div>

      <!-- Channel tabs -->
      <div v-else class="flex gap-1 px-2 pb-2 overflow-x-auto">
        <button
          v-for="room in rooms"
          :key="room.id"
          @click="handleRoomSelect(room)"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors',
            currentRoom?.id === room.id
              ? 'bg-primary text-white'
              : 'bg-white/5 hover:bg-white/10 text-[var(--text-secondary)]'
          ]"
        >
          <Icon :name="levelIcon(room.level)" class="w-4 h-4 flex-shrink-0" />
          <span>{{ room.name }}</span>
          <span
            v-if="room.unreadCount"
            :class="[
              'text-[10px] min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center',
              currentRoom?.id === room.id ? 'bg-white/20 text-white' : 'bg-primary text-white'
            ]"
          >
            {{ room.unreadCount > 99 ? '99+' : room.unreadCount }}
          </span>
        </button>
      </div>
    </header>

    <!-- =====================================================================
         CHAT AREA — основная область чата
         ===================================================================== -->
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <template v-if="currentRoom">
        <!-- Room info bar -->
        <div class="flex items-center gap-2 px-4 py-2 bg-white/5 text-xs text-[var(--text-muted)]">
          <span>{{ currentRoom.membersCount }} участников</span>
        </div>

        <!-- Pinned messages -->
        <CommunityPinnedMessages
          v-if="pinnedMessages.length > 0"
          :messages="pinnedMessages"
        />

        <!-- Messages -->
        <div
          ref="messagesContainer"
          class="flex-1 overflow-y-auto py-2 font-mono text-sm relative"
          @scroll="handleScroll"
        >
          <!-- Sticky date label -->
          <div
            v-if="visibleDate"
            class="sticky top-0 z-10 flex items-center justify-center py-2 pointer-events-none"
          >
            <div class="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs text-[var(--text-muted)] shadow-lg">
              {{ visibleDate }}
            </div>
          </div>

          <!-- Loading indicator for history -->
          <div v-if="isLoadingMessages && messages.length > 0" class="text-center py-2">
            <Icon name="heroicons:arrow-path" class="w-4 h-4 text-primary animate-spin mx-auto" />
          </div>

          <!-- Empty state -->
          <div v-if="!isLoadingMessages && messages.length === 0" class="text-center py-12">
            <p class="text-[var(--text-muted)]">Нет сообщений</p>
            <p class="text-sm text-[var(--text-muted)] mt-1">Напишите первое!</p>
          </div>

          <!-- Messages list (IRC style) -->
          <template v-for="(msg, index) in messages" :key="msg.id">
            <!-- Date separator -->
            <div
              v-if="getDateSeparator(msg, index)"
              class="flex items-center justify-center py-4"
            >
              <div class="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-[var(--text-muted)]">
                {{ getDateSeparator(msg, index) }}
              </div>
            </div>
            <div
              :ref="el => { if (el) messageRefs.set(index, el as HTMLElement) }"
              :data-message-index="index"
            >
              <CommunityMessage
                :message="msg"
                :is-own="msg.userId === userStore.user?.id"
                :show-moderation="showModeration"
                :is-user-moderator="isUserModerator(msg.userId)"
                @contextmenu="handleContextMenu"
                @retry="handleRetry"
              />
            </div>
          </template>
        </div>

        <!-- Typing indicator -->
        <CommunityTypingIndicator :typing-users="typingUsers" />

        <!-- Muted banner -->
        <div
          v-if="isMuted"
          class="px-4 py-2 bg-yellow-500/20 text-yellow-400 text-sm flex items-center gap-2"
        >
          <Icon name="heroicons:speaker-x-mark" class="w-4 h-4" />
          <span>Вы не можете писать до {{ mutedUntilFormatted }}</span>
        </div>

        <!-- Input -->
        <CommunityMessageInput
          ref="messageInputRef"
          :disabled="isSending || isMuted"
          :reply-to="replyTo"
          @send="handleSend"
          @cancel-reply="replyTo = null"
          @upload="handleUpload"
          @typing="broadcastTyping"
        />
      </template>

      <!-- No room selected -->
      <div v-else class="flex-1 flex items-center justify-center">
        <p class="text-[var(--text-muted)]">Выберите канал выше</p>
      </div>
    </main>

    <!-- Context Menu -->
    <CommunityContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :is-own="contextMenu.message?.userId === userStore.user?.id"
      :is-pinned="contextMenu.message?.isPinned || false"
      :show-moderation="showModeration"
      @close="closeContextMenu"
      @reply="handleContextReply"
      @report="contextMenu.message && handleReportClick(contextMenu.message.id as number)"
      @pin="handleContextPin"
      @mute="contextMenu.message && handleMuteClick(contextMenu.message.userId)"
      @delete="handleContextDelete"
    />

    <!-- Modals -->
    <CommunityMuteModal
      v-if="showMuteModal && muteTargetUserId"
      :user-id="muteTargetUserId"
      :user-name="muteTargetUserName"
      @close="showMuteModal = false"
      @mute="handleMuteSubmit"
    />

    <CommunityReportModal
      v-if="showReportModal && reportTargetMessageId"
      :message-id="reportTargetMessageId"
      @close="showReportModal = false"
      @report="handleReportSubmit"
    />
  </div>
</template>
