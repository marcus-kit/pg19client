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

// Поиск по загруженным сообщениям (UI-only, desktop-first)
const searchQuery = ref('')
const searchQueryTrimmed = computed(() => searchQuery.value.trim())
const isSearching = computed(() => searchQueryTrimmed.value.length >= 2)
const showMobileSearch = ref(false)
const mobileSearchInput = ref<HTMLInputElement | null>(null)

const filteredMessages = computed(() => {
  if (!isSearching.value) return messages.value
  const q = searchQueryTrimmed.value.toLowerCase()
  return messages.value.filter(m => {
    if (m.isDeleted) return false

    const content = (m.content || '').toLowerCase()
    if (content.includes(q)) return true

    const nickname = (m.user?.nickname || '').toLowerCase()
    const firstName = (m.user?.firstName || '').toLowerCase()
    const lastName = (m.user?.lastName || '').toLowerCase()
    const fullName = `${firstName} ${lastName}`.trim()

    return nickname.includes(q) || firstName.includes(q) || lastName.includes(q) || fullName.includes(q)
  })
})

const searchStats = computed(() => {
  if (!isSearching.value) return null
  return `${filteredMessages.value.length} из ${messages.value.length}`
})

// Ответ на сообщение
const replyTo = ref<CommunityMessage | null>(null)
const messageInputRef = ref<{ focus: () => void } | null>(null)

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
})

// =============================================================================
// WATCHERS
// =============================================================================

// Автоскролл при новых сообщениях
watch(messages, () => {
  nextTick(() => {
    // Не авто-скроллим, когда пользователь в режиме поиска
    if (isSearching.value) return
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}, { deep: true })

// Сброс поиска при смене комнаты
watch(currentRoom, () => {
  searchQuery.value = ''
  showMobileSearch.value = false
})

watch(showMobileSearch, (open) => {
  if (!open) return
  nextTick(() => {
    mobileSearchInput.value?.focus()
  })
})
</script>

<template>
  <!-- =========================================================================
       COMMUNITY PAGE — полноэкранный чат сообщества
       Высота: 100vh минус header и mobile nav
       ========================================================================= -->
  <div class="h-[calc(100vh-theme(spacing.16)-theme(spacing.20))] md:h-[calc(100vh-theme(spacing.16)-theme(spacing.6))] flex flex-col bg-[var(--bg-primary)]">

    <!-- =====================================================================
         HEADER — табы комнат и счётчик онлайн
         ===================================================================== -->
    <header class="flex-shrink-0 border-b border-white/10">
      <!-- Title row -->
      <div class="flex items-center justify-between px-4 py-2">
        <h2 class="font-bold text-[var(--text-primary)]">Сообщество</h2>
        <div class="flex items-center gap-3">
          <!-- Mobile search button -->
          <button
            class="md:hidden p-2 rounded-lg text-[var(--text-muted)] active:bg-white/10"
            @click="showMobileSearch = !showMobileSearch"
            :aria-label="showMobileSearch ? 'Закрыть поиск' : 'Открыть поиск'"
            :title="showMobileSearch ? 'Закрыть поиск' : 'Поиск'"
          >
            <Icon :name="showMobileSearch ? 'heroicons:x-mark' : 'heroicons:magnifying-glass'" class="w-5 h-5" />
          </button>

          <!-- Desktop search -->
          <div class="hidden md:block relative">
            <Icon name="heroicons:magnifying-glass" class="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Поиск по сообщениям"
              class="w-[320px] pl-9 pr-9 py-2 rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/30"
              style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
            />
            <button
              v-if="searchQuery"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              @click="searchQuery = ''"
              aria-label="Очистить поиск"
              title="Очистить"
            >
              <Icon name="heroicons:x-mark" class="w-4 h-4" />
            </button>
          </div>

          <p class="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-accent animate-pulse" />
            {{ onlineCount }} онлайн
          </p>
        </div>
      </div>

      <!-- Mobile search panel (top-sheet) -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        leave-active-class="transition-all duration-150 ease-in"
        enter-from-class="opacity-0 -translate-y-2"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="showMobileSearch" class="md:hidden px-4 pb-3">
          <div class="relative">
            <Icon name="heroicons:magnifying-glass" class="w-5 h-5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref="mobileSearchInput"
              v-model="searchQuery"
              type="text"
              inputmode="search"
              placeholder="Поиск по загруженным"
              class="w-full pl-10 pr-10 py-3 rounded-2xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/30"
              style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
            />
            <button
              v-if="searchQuery"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl text-[var(--text-muted)] active:bg-white/10"
              @click="searchQuery = ''"
              aria-label="Очистить поиск"
              title="Очистить"
            >
              <Icon name="heroicons:x-mark" class="w-5 h-5" />
            </button>
          </div>
          <div class="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Поиск по загруженным сообщениям</span>
            <span v-if="isSearching">{{ searchStats }}</span>
          </div>
        </div>
      </Transition>

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
        <div class="flex items-center justify-between gap-3 px-4 py-2 bg-white/5 text-xs text-[var(--text-muted)]">
          <span>{{ currentRoom.membersCount }} участников</span>
          <div v-if="isSearching" class="hidden md:flex items-center gap-2">
            <span>Поиск по загруженным: {{ searchStats }}</span>
            <span class="text-[10px] text-[var(--text-muted)]">(только по загруженным сообщениям)</span>
          </div>
        </div>
        <div v-if="isSearching" class="md:hidden px-4 py-1 text-xs text-[var(--text-muted)]">
          Поиск по загруженным: {{ searchStats }}
        </div>

        <!-- Pinned messages -->
        <CommunityPinnedMessages
          v-if="pinnedMessages.length > 0"
          :messages="pinnedMessages"
        />

        <!-- Messages -->
        <div
          ref="messagesContainer"
          class="flex-1 overflow-y-auto py-2 font-mono text-sm"
          @scroll="handleScroll"
        >
          <!-- Loading indicator for history -->
          <div v-if="isLoadingMessages && messages.length > 0" class="text-center py-2">
            <Icon name="heroicons:arrow-path" class="w-4 h-4 text-primary animate-spin mx-auto" />
          </div>

          <!-- Empty state -->
          <div v-if="!isLoadingMessages && messages.length === 0" class="text-center py-12">
            <p class="text-[var(--text-muted)]">Нет сообщений</p>
            <p class="text-sm text-[var(--text-muted)] mt-1">Напишите первое!</p>
          </div>

          <!-- Search empty state -->
          <div
            v-else-if="!isLoadingMessages && isSearching && filteredMessages.length === 0"
            class="text-center py-12"
          >
            <p class="text-[var(--text-muted)]">Ничего не найдено</p>
            <p class="text-sm text-[var(--text-muted)] mt-1">
              Поиск работает только по загруженным сообщениям
            </p>
            <button
              class="mt-3 text-sm text-primary hover:underline"
              @click="searchQuery = ''"
            >
              Сбросить поиск
            </button>
          </div>

          <!-- Messages list (IRC style) -->
          <CommunityMessage
            v-for="msg in filteredMessages"
            :key="msg.id"
            :message="msg"
            :is-own="msg.userId === userStore.user?.id"
            :show-moderation="showModeration"
            :is-user-moderator="isUserModerator(msg.userId)"
            :highlight="isSearching ? searchQueryTrimmed : ''"
            @contextmenu="handleContextMenu"
            @retry="handleRetry"
          />
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
