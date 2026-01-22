<script setup lang="ts">
/**
 * ChatMessage — компонент одного сообщения в чате поддержки
 * Отображает сообщения пользователя, оператора, бота и системные
 */
import type { ChatMessage } from '~/types/chat'
import { formatFileSize } from '~/composables/useFormatters'

const props = defineProps<{
  message: ChatMessage
}>()

// Определение типа отправителя
const isUser = computed(() => props.message.sender_type === 'user')
const isOperator = computed(() => props.message.sender_type === 'admin' || props.message.sender_type === 'bot') // Бот визуально = оператор
const isSystem = computed(() => props.message.sender_type === 'system')

// Вложения
const isImage = computed(() => props.message.content_type === 'image')
const isFile = computed(() => props.message.content_type === 'file')
const hasAttachment = computed(() => !!props.message.attachment_url)

// Форматирование времени (ЧЧ:ММ)
const formattedTime = computed(() => {
  const date = new Date(props.message.created_at)
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
})

// Имя отправителя для отображения
const senderLabel = computed(() => {
  if (isOperator.value) return props.message.sender_name || 'Оператор'
  if (isSystem.value) return 'Система'
  return 'Вы'
})
</script>

<template>
  <div
    class="flex gap-2"
    :class="isUser ? 'flex-row-reverse' : 'flex-row'"
  >
    <!-- Аватар отправителя -->
    <div
      class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
      :class="{
        'bg-primary/20': isUser,
        'bg-accent/20': isOperator,
        'bg-white/10': isSystem
      }"
    >
      <Icon
        :name="isUser ? 'heroicons:user' : isOperator ? 'heroicons:user-circle' : 'heroicons:information-circle'"
        class="w-4 h-4"
        :class="{
          'text-primary': isUser,
          'text-accent': isOperator,
          'text-[var(--text-muted)]': isSystem
        }"
      />
    </div>

    <!-- Блок сообщения -->
    <div
      class="max-w-[75%] rounded-2xl px-4 py-2"
      :class="{
        'bg-primary text-white rounded-br-md': isUser,
        'bg-white/10 text-[var(--text-primary)] rounded-bl-md': !isUser
      }"
    >
      <!-- Имя отправителя (только для не-пользователя) -->
      <div
        v-if="!isUser"
        class="text-xs font-medium mb-1"
        :class="{
          'text-accent': isOperator,
          'text-[var(--text-muted)]': isSystem
        }"
      >
        {{ senderLabel }}
      </div>

      <!-- Текст сообщения -->
      <p v-if="message.content" class="text-sm whitespace-pre-wrap break-words">
        {{ message.content }}
      </p>

      <!-- Вложение: изображение -->
      <div v-if="isImage && hasAttachment" class="mt-2">
        <a :href="message.attachment_url!" target="_blank" class="block">
          <img
            :src="message.attachment_url!"
            :alt="message.attachment_name || 'Изображение'"
            class="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          />
        </a>
      </div>

      <!-- Вложение: файл -->
      <a
        v-else-if="isFile && hasAttachment"
        :href="message.attachment_url!"
        target="_blank"
        class="mt-2 flex items-center gap-2 p-2 rounded-lg transition-colors"
        :class="isUser ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 hover:bg-white/10'"
      >
        <Icon name="heroicons:document" class="w-5 h-5 flex-shrink-0" :class="isUser ? 'text-white/80' : 'text-primary'" />
        <div class="flex-1 min-w-0">
          <p class="text-sm truncate">{{ message.attachment_name }}</p>
          <p class="text-xs" :class="isUser ? 'text-white/60' : 'text-[var(--text-muted)]'">
            {{ formatFileSize(message.attachment_size) }}
          </p>
        </div>
        <Icon name="heroicons:arrow-down-tray" class="w-4 h-4 flex-shrink-0" :class="isUser ? 'text-white/60' : 'text-[var(--text-muted)]'" />
      </a>

      <!-- Время отправки -->
      <div
        class="text-[10px] mt-1"
        :class="isUser ? 'text-white/70 text-right' : 'text-[var(--text-muted)]'"
      >
        {{ formattedTime }}
      </div>
    </div>
  </div>
</template>
