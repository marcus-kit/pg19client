<script setup lang="ts">
/**
 * CommunityContextMenu — контекстное меню сообщения
 *
 * Особенности:
 * - Позиционирование по координатам клика
 * - Действия: ответить, пожаловаться
 * - Модераторские действия: закрепить, замутить, удалить
 * - Закрытие по клику вне или Escape
 */

// =============================================================================
// PROPS & EMIT
// =============================================================================

interface Props {
  show: boolean
  x: number
  y: number
  isOwn: boolean
  isPinned: boolean
  showModeration: boolean
  isMobile?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isMobile: false
})

const emit = defineEmits<{
  close: []
  reply: []
  edit: []
  report: []
  pin: []
  mute: []
  delete: []
}>()

// =============================================================================
// COMPUTED
// =============================================================================

// Вычисляем позицию меню с учетом границ экрана
const menuStyle = computed(() => {
  if (!props.show) return {}
  
  if (props.isMobile) {
    // На мобилке позиционируем рядом с сообщением, но не выходим за границы
    const menuWidth = 200 // примерная ширина меню
    const menuHeight = 100 // примерная высота меню
    const padding = 10 // отступ от краев
    
    let left = props.x
    let top = props.y - menuHeight - 10 // немного выше точки касания
    
    // Проверяем границы экрана
    if (typeof window !== 'undefined') {
      // Если меню выходит за правый край
      if (left + menuWidth > window.innerWidth - padding) {
        left = window.innerWidth - menuWidth - padding
      }
      // Если меню выходит за левый край
      if (left < padding) {
        left = padding
      }
      // Если меню выходит за верхний край
      if (top < padding) {
        top = props.y + 10 // показываем ниже точки касания
      }
      // Если меню выходит за нижний край
      if (top + menuHeight > window.innerHeight - 100) { // 100px для нижней навигации
        top = window.innerHeight - menuHeight - 100 - padding
      }
    }
    
    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 50
    }
  } else {
    // На десктопе используем стандартное позиционирование
    return {
      position: 'fixed',
      top: `${props.y}px`,
      left: `${props.x}px`,
      zIndex: 50
    }
  }
})

// =============================================================================
// METHODS
// =============================================================================

// Закрыть при клике вне меню
function handleClickOutside(event: MouseEvent | TouchEvent): void {
  // Проверяем, что клик был вне меню
  const target = event.target as HTMLElement
  if (target && !target.closest('.context-menu-container')) {
    emit('close')
  }
}

// Закрыть при Escape
function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    emit('close')
  }
}

// Обработчики с автозакрытием
function handleReply(): void {
  emit('reply')
  emit('close')
}

function handleEdit(): void {
  emit('edit')
  emit('close')
}

function handleReport(): void {
  emit('report')
  emit('close')
}

function handlePin(): void {
  emit('pin')
  emit('close')
}

function handleMute(): void {
  emit('mute')
  emit('close')
}

function handleDelete(): void {
  emit('delete')
  emit('close')
}

// =============================================================================
// LIFECYCLE
// =============================================================================

onMounted(() => {
  // Используем capture для touch событий на мобилке
  document.addEventListener('click', handleClickOutside, true)
  document.addEventListener('touchstart', handleClickOutside, true)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
  document.removeEventListener('touchstart', handleClickOutside, true)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop для закрытия при клике вне меню (только на мобилке) -->
    <Transition name="fade">
      <div
        v-if="show && isMobile"
        class="fixed inset-0 z-40"
        @click="handleClickOutside"
        @touchstart="handleClickOutside"
      />
    </Transition>
    
    <Transition name="fade">
      <div
        v-if="show"
        :style="menuStyle"
        class="context-menu-container bg-[var(--bg-surface)] border border-white/10 rounded-lg py-1 shadow-xl"
        :class="isMobile ? 'min-w-[200px]' : 'min-w-[160px]'"
        @click.stop
        @touchstart.stop
      >
        <button
          @click="handleReply"
          class="w-full px-3 py-1.5 text-left hover:bg-white/10 flex items-center gap-2 text-[var(--text-primary)]"
        >
          <Icon name="heroicons:arrow-uturn-left" class="w-4 h-4" />
          Ответить
        </button>

        <button
          v-if="!isOwn"
          @click="handleReport"
          class="w-full px-3 py-1.5 text-left hover:bg-white/10 flex items-center gap-2 text-[var(--text-primary)]"
        >
          <Icon name="heroicons:flag" class="w-4 h-4" />
          Пожаловаться
        </button>

        <!-- Десктопные опции (скрыты на мобилке) -->
        <template v-if="!isMobile">
          <button
            v-if="isOwn"
            @click="handleEdit"
            class="w-full px-3 py-1.5 text-left hover:bg-white/10 flex items-center gap-2 text-[var(--text-primary)]"
          >
            <Icon name="heroicons:pencil" class="w-4 h-4" />
            Редактировать
          </button>

          <template v-if="showModeration">
          <hr class="border-white/10 my-1" />

          <button
            @click="handlePin"
            class="w-full px-3 py-1.5 text-left hover:bg-white/10 flex items-center gap-2 text-[var(--text-primary)]"
          >
            <Icon :name="isPinned ? 'heroicons:bookmark-slash' : 'heroicons:bookmark'" class="w-4 h-4" />
            {{ isPinned ? 'Открепить' : 'Закрепить' }}
          </button>

          <button
            v-if="!isOwn"
            @click="handleMute"
            class="w-full px-3 py-1.5 text-left hover:bg-white/10 flex items-center gap-2 text-[var(--text-primary)]"
          >
            <Icon name="heroicons:speaker-x-mark" class="w-4 h-4" />
            Замутить
          </button>

          <button
            @click="handleDelete"
            class="w-full px-3 py-1.5 text-left hover:bg-white/10 flex items-center gap-2 text-red-400"
          >
            <Icon name="heroicons:trash" class="w-4 h-4" />
            Удалить
          </button>
          </template>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.1s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
