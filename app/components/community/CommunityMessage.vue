<script setup lang="ts">
/**
 * CommunityMessage — сообщение в чате
 *
 * Особенности:
 * - Свои сообщения справа, чужие слева
 * - Время под текстом сообщения
 * - Поддержка изображений, ответов, удалённых сообщений
 * - Статусы отправки: sending, failed, retry
 * - Контекстное меню по ПКМ
 */
import type { CommunityMessage } from '~/types/community'
import { truncateText } from '~/composables/useFormatters'

// =============================================================================
// PROPS & EMIT
// =============================================================================

const props = defineProps<{
  message: CommunityMessage
  isOwn: boolean
  showModeration?: boolean
  isUserModerator?: boolean
}>()

const emit = defineEmits<{
  reply: [message: CommunityMessage]
  pin: [messageId: number]
  delete: [messageId: number]
  report: [messageId: number]
  mute: [userId: number]
  retry: [tempId: string]
  contextmenu: [event: MouseEvent, message: CommunityMessage]
  scrollToReply: [messageId: string | number]
}>()

// =============================================================================
// COMPUTED
// =============================================================================

// IRC-style time format: [HH:MM]
const formattedTime = computed(() => {
  const date = new Date(props.message.createdAt)
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
})

// Display name: nickname > firstName
const displayName = computed(() => {
  if (!props.message.user) return 'Аноним'
  return props.message.user.firstName || 'Аноним'
})

// =============================================================================
// STATE
// =============================================================================

const showImageModal = ref(false)
const isHolding = ref(false) // Состояние долгого нажатия для визуальной обратной связи
let touchHoldTimer: ReturnType<typeof setTimeout> | null = null
let touchStartX = 0
let touchStartY = 0
let touchTarget: HTMLElement | null = null // Сохраняем элемент, на котором началось касание
let replyQuoteTouchStartTime = 0 // Время начала касания на превью ответа

// =============================================================================
// METHODS
// =============================================================================

// Обработчик контекстного меню (для десктопа)
function handleContextMenu(event: MouseEvent): void {
  emit('contextmenu', event, props.message)
}

// Обработчик долгого нажатия на мобилке
function handleTouchStart(event: TouchEvent): void {
  // Только на мобилке (ширина экрана < 768px)
  if (typeof window !== 'undefined' && window.innerWidth >= 768) {
    return
  }
  
  // Сохраняем элемент, на котором началось касание
  touchTarget = event.target as HTMLElement
  
  const touch = event.touches[0]
  if (!touch) return
  
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  
  // Включаем визуальную подсветку сразу при начале касания
  isHolding.value = true
  
  // Запускаем таймер для долгого нажатия (500ms)
  touchHoldTimer = setTimeout(() => {
    // Вибрация (если поддерживается)
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
    
    // Создаём синтетическое событие для контекстного меню
    const syntheticEvent = {
      clientX: touchStartX,
      clientY: touchStartY,
      preventDefault: () => {},
      stopPropagation: () => {}
    } as MouseEvent
    
    emit('contextmenu', syntheticEvent, props.message)
    touchHoldTimer = null
    // Убираем подсветку через небольшую задержку после открытия меню
    setTimeout(() => {
      isHolding.value = false
    }, 300)
  }, 500)
}

// Отмена долгого нажатия
function handleTouchEnd(): void {
  const wasLongPress = touchHoldTimer === null // Если таймер уже null, значит долгое нажатие сработало
  const wasImageClick = touchTarget && (
    touchTarget.tagName === 'IMG' || 
    (touchTarget.tagName === 'BUTTON' && touchTarget.querySelector('img'))
  )
  
  if (touchHoldTimer) {
    clearTimeout(touchHoldTimer)
    touchHoldTimer = null
  }
  
  // Убираем подсветку
  isHolding.value = false
  
  // Если это был обычный тап (не долгое нажатие) по изображению - открываем модальное окно
  if (!wasLongPress && wasImageClick && props.message.contentType === 'image' && props.message.imageUrl) {
    showImageModal.value = true
  }
  
  touchTarget = null
}

// Обработчик клика на превью ответа (для мобилки)
function handleReplyQuoteClick(): void {
  if (props.message.replyTo?.id) {
    emit('scrollToReply', props.message.replyTo.id)
  }
}

// Обработчик touch-событий на превью ответа (для мобилки)
function handleReplyQuoteTouchStart(event: TouchEvent): void {
  // Останавливаем всплытие, чтобы не триггерить долгое нажатие на сообщении
  event.stopPropagation()
  replyQuoteTouchStartTime = Date.now()
}

function handleReplyQuoteTouchEnd(event: TouchEvent): void {
  // Останавливаем всплытие
  event.stopPropagation()
  
  // Если это был быстрый тап (менее 300ms) - переходим к сообщению
  const touchDuration = Date.now() - replyQuoteTouchStartTime
  if (touchDuration < 300 && props.message.replyTo?.id) {
    emit('scrollToReply', props.message.replyTo.id)
  }
  
  replyQuoteTouchStartTime = 0
}

// Отмена при движении пальца
function handleTouchMove(event: TouchEvent): void {
  if (!touchHoldTimer) return
  
  const touch = event.touches[0]
  if (!touch) return
  
  const deltaX = Math.abs(touch.clientX - touchStartX)
  const deltaY = Math.abs(touch.clientY - touchStartY)
  
  // Если палец сдвинулся больше чем на 10px, отменяем долгое нажатие
  if (deltaX > 10 || deltaY > 10) {
    if (touchHoldTimer) {
      clearTimeout(touchHoldTimer)
      touchHoldTimer = null
    }
    // Убираем подсветку при движении
    isHolding.value = false
  }
}

// Очистка при размонтировании
onUnmounted(() => {
  if (touchHoldTimer) {
    clearTimeout(touchHoldTimer)
  }
})

// Открыть изображение в модальном окне
function openImageModal(event: MouseEvent | TouchEvent): void {
  event.preventDefault()
  event.stopPropagation()
  // Отменяем долгое нажатие если оно было запущено
  if (touchHoldTimer) {
    clearTimeout(touchHoldTimer)
    touchHoldTimer = null
  }
  isHolding.value = false
  showImageModal.value = true
}

// Закрыть модальное окно
function closeImageModal(): void {
  showImageModal.value = false
}
</script>

<template>
  <div
    :class="[
      'flex px-3 py-2',
      isOwn ? 'justify-end md:justify-start' : 'justify-start',
      message.isDeleted && 'opacity-50',
      message.status === 'sending' && 'opacity-60',
      message.status === 'failed' && 'bg-red-500/10'
    ]"
    @contextmenu.prevent="handleContextMenu"
  >
    <div
      :class="[
        'flex flex-col max-w-[70%]',
        isOwn ? 'items-end md:items-start' : 'items-start'
      ]"
    >
      <!-- Message bubble -->
      <div
        :class="[
          'rounded-2xl px-4 py-2 mb-1 break-words relative transition-all duration-200',
          isOwn
            ? 'bg-blue-500 text-white'
            : 'bg-white/10 text-[var(--text-primary)]',
          isHolding && isOwn && 'bg-blue-400 brightness-110 scale-[1.02] shadow-lg z-50',
          isHolding && !isOwn && 'bg-white/20 brightness-110 scale-[1.02] shadow-lg z-50'
        ]"
        :style="isHolding ? { filter: 'none', backdropFilter: 'none' } : {}"
        @touchstart.prevent="handleTouchStart"
        @touchend.prevent="handleTouchEnd"
        @touchmove.prevent="handleTouchMove"
      >
        <!-- Nickname (для чужих на мобильных, для всех на десктопе) -->
        <div v-if="!isOwn" class="flex items-center gap-2 mb-1">
          <span class="text-xs font-medium opacity-80">{{ displayName }}</span>
          <span
            v-if="isUserModerator"
            class="text-[10px] text-yellow-400 bg-yellow-400/20 px-1.5 py-0.5 rounded"
            title="Модератор"
          >MOD</span>
        </div>
        <!-- Nickname для своих сообщений на десктопе -->
        <div v-if="isOwn" class="hidden md:flex items-center gap-2 mb-1">
          <span class="text-xs font-medium opacity-80">{{ displayName }}</span>
          <span
            v-if="isUserModerator"
            class="text-[10px] text-yellow-400 bg-yellow-400/20 px-1.5 py-0.5 rounded"
            title="Модератор"
          >MOD</span>
        </div>

        <!-- Reply quote -->
        <div 
          v-if="message.replyTo" 
          class="mb-1 pb-1 border-l-2 pl-2 opacity-80 text-sm cursor-pointer hover:opacity-100 transition-opacity active:opacity-100" 
          :class="isOwn ? 'border-white/30' : 'border-white/20'"
          @click.stop="handleReplyQuoteClick"
          @touchstart.stop="handleReplyQuoteTouchStart"
          @touchend.stop="handleReplyQuoteTouchEnd"
        >
          <div class="flex items-center gap-1">
            <Icon name="heroicons:arrow-uturn-left" class="w-3 h-3" />
            <span class="font-medium">{{ message.replyTo.user?.firstName }}:</span>
          </div>
          <div class="text-xs truncate">{{ truncateText(message.replyTo.content, 30) }}</div>
        </div>

        <!-- Content wrapper with time for own messages -->
        <div v-if="isOwn" class="relative pb-3 overflow-hidden">
          <!-- Content -->
          <div v-if="message.isDeleted" class="italic opacity-70 pr-12">Сообщение удалено</div>
          <template v-else>
            <!-- Image -->
            <template v-if="message.contentType === 'image' && message.imageUrl">
              <button 
                @click="openImageModal" 
                class="block mb-1"
              >
                <img 
                  :src="message.imageUrl" 
                  :alt="message.content || 'Изображение'" 
                  class="max-w-[250px] max-h-[250px] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity" 
                />
              </button>
              <div v-if="message.content" class="whitespace-pre-wrap pr-12 break-words">{{ message.content }}</div>
              <div v-else class="pr-12 min-h-[1em]"></div>
            </template>
            <!-- Text only -->
            <div v-else class="whitespace-pre-wrap pr-12 break-words">{{ message.content }}</div>
          </template>
          
          <!-- Pinned badge -->
          <div v-if="message.isPinned" class="mt-1 flex items-center gap-1 text-xs opacity-80">
            <Icon name="heroicons:bookmark-solid" class="w-3 h-3" />
            <span>Закреплено</span>
          </div>

          <!-- Status indicators -->
          <div v-if="message.status === 'sending'" class="mt-1 flex items-center gap-1 text-xs opacity-70">
            <Icon name="heroicons:arrow-path" class="w-3 h-3 animate-spin" />
            <span>Отправка...</span>
          </div>
          <div v-if="message.status === 'failed'" class="mt-1 flex items-center gap-1 text-xs opacity-70">
            <Icon name="heroicons:exclamation-circle" class="w-3 h-3" />
            <span>не отправлено</span>
            <button
              @click.stop="emit('retry', String(message.id))"
              class="underline hover:no-underline"
            >
              повторить
            </button>
          </div>
          
          <!-- Time inside bubble for own messages - positioned bottom right -->
          <div class="absolute bottom-0 right-2 flex items-center gap-1">
            <span v-if="message.createdAt !== message.updatedAt" class="text-[9px] text-white/50 italic">изменено</span>
            <span class="text-[10px] text-white/70 font-mono tabular-nums whitespace-nowrap">
              {{ formattedTime }}
      </span>
          </div>
        </div>

        <!-- Content for other users' messages -->
        <div v-else class="relative pb-3">
      <!-- Content -->
          <div v-if="message.isDeleted" class="italic opacity-70 pr-12">Сообщение удалено</div>
      <template v-else>
        <!-- Image -->
        <template v-if="message.contentType === 'image' && message.imageUrl">
              <button 
                @click="openImageModal" 
                class="block mb-1"
              >
                <img 
                  :src="message.imageUrl" 
                  :alt="message.content || 'Изображение'" 
                  class="max-w-[250px] max-h-[250px] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity" 
                />
              </button>
              <div v-if="message.content" class="whitespace-pre-wrap pr-12">{{ message.content }}</div>
              <div v-else class="pr-12 min-h-[1em]"></div>
        </template>
        <!-- Text only -->
            <div v-else class="whitespace-pre-wrap pr-12">{{ message.content }}</div>
      </template>

      <!-- Pinned badge -->
          <div v-if="message.isPinned" class="mt-1 flex items-center gap-1 text-xs opacity-80">
            <Icon name="heroicons:bookmark-solid" class="w-3 h-3" />
            <span>Закреплено</span>
          </div>

      <!-- Status indicators -->
          <div v-if="message.status === 'sending'" class="mt-1 flex items-center gap-1 text-xs opacity-70">
            <Icon name="heroicons:arrow-path" class="w-3 h-3 animate-spin" />
            <span>Отправка...</span>
          </div>
          <div v-if="message.status === 'failed'" class="mt-1 flex items-center gap-1 text-xs opacity-70">
            <Icon name="heroicons:exclamation-circle" class="w-3 h-3" />
            <span>не отправлено</span>
        <button
          @click.stop="emit('retry', String(message.id))"
              class="underline hover:no-underline"
        >
          повторить
        </button>
          </div>

          <!-- Time inside bubble for other users' messages - positioned bottom right -->
          <div class="absolute bottom-0 right-2 flex items-center gap-1">
            <span v-if="message.createdAt !== message.updatedAt" class="text-[9px] text-[var(--text-muted)] opacity-50 italic">изменено</span>
            <span class="text-[10px] text-[var(--text-muted)] font-mono tabular-nums whitespace-nowrap opacity-70">
              {{ formattedTime }}
      </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Image Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="showImageModal && message.imageUrl"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        @click="closeImageModal"
      >
        <button
          @click="closeImageModal"
          class="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Icon name="heroicons:x-mark" class="w-6 h-6 text-white" />
        </button>
        <img
          :src="message.imageUrl"
          :alt="message.content || 'Изображение'"
          class="max-w-full max-h-[90vh] object-contain rounded-lg"
          @click.stop
        />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active img,
.modal-leave-active img {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from img,
.modal-leave-to img {
  transform: scale(0.9);
  opacity: 0;
}
</style>
