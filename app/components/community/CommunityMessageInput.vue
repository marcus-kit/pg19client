<script setup lang="ts">
/**
 * CommunityMessageInput — поле ввода сообщения
 *
 * Особенности:
 * - Превью ответа на сообщение
 * - Загрузка изображений (до 5 МБ)
 * - Отправка по Enter (Shift+Enter — перенос строки)
 * - Экспорт метода focus для родителя
 */
import type { CommunityMessage } from '~/types/community'

// =============================================================================
// PROPS & EMIT
// =============================================================================

const props = defineProps<{
  disabled?: boolean
  replyTo?: CommunityMessage | null
  editingMessage?: CommunityMessage | null
}>()

const emit = defineEmits<{
  send: [content: string, options?: { replyToId?: string }]
  cancelReply: []
  upload: [file: File]
  typing: []
  scrollToReply: [messageId: string | number]
}>()

// =============================================================================
// STATE — реактивное состояние
// =============================================================================

const text = ref('')
const fileInput = ref<HTMLInputElement>()
const textInput = ref<HTMLInputElement>()

// =============================================================================
// METHODS
// =============================================================================

// Метод focus для родителя
function focus(): void {
  nextTick(() => {
    textInput.value?.focus()
  })
}

// Отправить сообщение
function handleSend(): void {
  if (!text.value.trim() || props.disabled) return

  // Если редактируем, не передаем replyToId
  if (props.editingMessage) {
    emit('send', text.value, undefined)
    text.value = ''
    emit('cancelReply')
    return
  }

  // Передаем replyToId если есть replyTo
  const replyToId = props.replyTo?.id ? String(props.replyTo.id) : undefined
  
  // Отправляем с replyToId
  emit('send', text.value, replyToId ? { replyToId } : undefined)
  
  text.value = ''
  emit('cancelReply')
}

// Обработка нажатия клавиш
function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

// Обработка выбора файла
function handleFileSelect(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]

  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      alert('Максимальный размер файла: 5 МБ')
      return
    }

    if (!file.type.startsWith('image/')) {
      alert('Можно загружать только изображения')
      return
    }

    emit('upload', file)
  }

  input.value = ''
}

// =============================================================================
// WATCHERS
// =============================================================================

// Заполняем поле ввода при редактировании
watch(() => props.editingMessage, (message) => {
  if (message) {
    text.value = message.content
    nextTick(() => {
      textInput.value?.focus()
      textInput.value?.select()
    })
  } else if (!props.replyTo) {
    text.value = ''
  }
}, { immediate: true })

// =============================================================================
// EXPOSE
// =============================================================================

defineExpose({ focus })
</script>

<template>
  <div class="flex-shrink-0 border-t border-white/10 p-3 pb-safe">
    <!-- Reply preview -->
    <div
      v-if="replyTo"
      class="mb-2 flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded text-sm cursor-pointer hover:bg-white/10 transition-colors"
      @click="replyTo.id && emit('scrollToReply', replyTo.id)"
    >
      <Icon name="heroicons:arrow-uturn-left" class="w-3 h-3 text-primary flex-shrink-0" />
      <span class="text-primary font-medium">{{ replyTo.user?.firstName }}:</span>
      <span class="text-[var(--text-muted)] truncate flex-1">{{ replyTo.content }}</span>
      <button @click.stop="emit('cancelReply')" class="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
        <Icon name="heroicons:x-mark" class="w-4 h-4" />
      </button>
    </div>

    <!-- Edit preview -->
    <div
      v-if="editingMessage"
      class="mb-2 flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded text-sm"
    >
      <Icon name="heroicons:pencil" class="w-3 h-3 text-blue-400 flex-shrink-0" />
      <span class="text-blue-400 font-medium">Редактирование сообщения</span>
      <button @click="emit('cancelReply')" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] ml-auto">
        <Icon name="heroicons:x-mark" class="w-4 h-4" />
      </button>
    </div>

    <!-- Input row -->
    <div class="flex items-center gap-2">
      <!-- Image upload -->
      <button
        @click="fileInput?.click()"
        :disabled="disabled"
        class="p-2 rounded hover:bg-white/10 disabled:opacity-50 text-[var(--text-muted)]"
        title="Изображение"
      >
        <Icon name="heroicons:photo" class="w-5 h-5" />
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileSelect"
      />

      <!-- Text input -->
      <input
        ref="textInput"
        v-model="text"
        @keydown="handleKeydown"
        @input="emit('typing')"
        :disabled="disabled"
        placeholder="Сообщение..."
        class="flex-1 px-3 py-2 rounded bg-white/5 border border-white/10 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary/50 disabled:opacity-50"
      />

      <!-- Send button -->
      <button
        @click="handleSend"
        :disabled="!text.trim() || disabled"
        class="p-2 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white flex items-center justify-center transition-colors"
      >
        <Icon name="heroicons:paper-airplane" class="w-5 h-5 rotate-[-90deg]" />
      </button>
    </div>
  </div>
</template>
