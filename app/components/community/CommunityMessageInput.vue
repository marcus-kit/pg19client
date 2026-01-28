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
  send: [content: string, options?: { replyToId?: string; file?: File }]
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
const selectedImage = ref<File | null>(null)
const imagePreview = ref<string | null>(null)

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
  // Проверяем что есть либо текст, либо изображение
  if ((!text.value.trim() && !selectedImage.value) || props.disabled) return

  // Если редактируем, не передаем replyToId и файл
  if (props.editingMessage) {
    emit('send', text.value, undefined)
    text.value = ''
    selectedImage.value = null
    imagePreview.value = null
    emit('cancelReply')
    return
  }

  // Передаем replyToId если есть replyTo
  const replyToId = props.replyTo?.id ? String(props.replyTo.id) : undefined
  
  // Отправляем с replyToId и файлом (если есть)
  emit('send', text.value, { 
    replyToId, 
    file: selectedImage.value || undefined 
  })
  
  text.value = ''
  selectedImage.value = null
  imagePreview.value = null
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
      input.value = ''
      return
    }

    if (!file.type.startsWith('image/')) {
      alert('Можно загружать только изображения')
      input.value = ''
      return
    }

    // Сохраняем файл и создаем превью
    selectedImage.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  input.value = ''
}

// Удалить выбранное изображение
function removeImage(): void {
  selectedImage.value = null
  imagePreview.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// =============================================================================
// WATCHERS
// =============================================================================

// Заполняем поле ввода при редактировании
watch(() => props.editingMessage, (message) => {
  if (message) {
    text.value = message.content
    selectedImage.value = null
    imagePreview.value = null
    nextTick(() => {
      textInput.value?.focus()
      textInput.value?.select()
    })
  } else if (!props.replyTo) {
    text.value = ''
  }
}, { immediate: true })

// Очищаем изображение при отмене ответа
watch(() => props.replyTo, (newReplyTo) => {
  if (!newReplyTo) {
    // Не очищаем изображение при отмене ответа, только при отправке
  }
})

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

    <!-- Image preview -->
    <div
      v-if="imagePreview"
      class="mb-2 relative inline-block"
    >
      <div class="relative rounded-lg overflow-hidden border border-white/10">
        <img 
          :src="imagePreview" 
          alt="Превью изображения" 
          class="max-h-32 max-w-full object-contain"
        />
        <button
          @click="removeImage"
          class="absolute top-1 right-1 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          title="Удалить изображение"
        >
          <Icon name="heroicons:x-mark" class="w-4 h-4" />
        </button>
      </div>
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
        :disabled="(!text.trim() && !selectedImage) || disabled"
        class="p-2 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white flex items-center justify-center transition-colors"
      >
        <Icon name="heroicons:paper-airplane" class="w-5 h-5 rotate-[-90deg]" />
      </button>
    </div>
  </div>
</template>
