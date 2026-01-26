<script setup lang="ts">
/**
 * CommunityMessage — сообщение в IRC-стиле
 *
 * Особенности:
 * - Формат: [HH:MM] <Nickname> Текст
 * - Поддержка изображений, ответов, удалённых сообщений
 * - Статусы отправки: sending, failed, retry
 * - Контекстное меню по ПКМ
 */
import type { CommunityMessage } from '~/types/community'

// =============================================================================
// PROPS & EMIT
// =============================================================================

const props = defineProps<{
  message: CommunityMessage
  isOwn: boolean
  showModeration?: boolean
  isUserModerator?: boolean
  highlight?: string
}>()

const emit = defineEmits<{
  reply: [message: CommunityMessage]
  pin: [messageId: number]
  delete: [messageId: number]
  report: [messageId: number]
  mute: [userId: number]
  retry: [tempId: string]
  contextmenu: [event: MouseEvent, message: CommunityMessage]
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
  return props.message.user.nickname || props.message.user.firstName || 'Аноним'
})

type HighlightPart = { text: string; isMatch: boolean }

const highlightQuery = computed(() => (props.highlight || '').trim())
const canHighlight = computed(() => highlightQuery.value.length >= 2 && !props.message.isDeleted)

const displayNameParts = computed<HighlightPart[] | null>(() => {
  if (!canHighlight.value) return null
  const text = displayName.value || ''
  const query = highlightQuery.value
  if (!text || !query) return null

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const res: HighlightPart[] = []

  let idx = 0
  while (idx < text.length) {
    const found = lowerText.indexOf(lowerQuery, idx)
    if (found === -1) {
      res.push({ text: text.slice(idx), isMatch: false })
      break
    }
    if (found > idx) {
      res.push({ text: text.slice(idx, found), isMatch: false })
    }
    res.push({ text: text.slice(found, found + query.length), isMatch: true })
    idx = found + query.length
  }

  return res.some(p => p.isMatch) ? res : null
})

const contentParts = computed<HighlightPart[] | null>(() => {
  if (!canHighlight.value) return null
  const text = props.message.content || ''
  const query = highlightQuery.value
  if (!text || !query) return null

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const res: HighlightPart[] = []

  let idx = 0
  while (idx < text.length) {
    const found = lowerText.indexOf(lowerQuery, idx)
    if (found === -1) {
      res.push({ text: text.slice(idx), isMatch: false })
      break
    }
    if (found > idx) {
      res.push({ text: text.slice(idx, found), isMatch: false })
    }
    res.push({ text: text.slice(found, found + query.length), isMatch: true })
    idx = found + query.length
  }

  return res.some(p => p.isMatch) ? res : null
})

// =============================================================================
// METHODS
// =============================================================================

// Обработчик контекстного меню
function handleContextMenu(event: MouseEvent): void {
  emit('contextmenu', event, props.message)
}
</script>

<template>
  <div
    :class="[
      'flex items-start gap-2 px-3 py-0.5 hover:bg-white/5 cursor-default select-text',
      message.isDeleted && 'opacity-50',
      message.status === 'sending' && 'opacity-60',
      message.status === 'failed' && 'bg-red-500/10'
    ]"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- Time -->
    <span class="text-xs text-[var(--text-muted)] w-11 flex-shrink-0 font-mono tabular-nums">
      {{ formattedTime }}
    </span>

    <!-- Nickname -->
    <span
      :class="[
        'font-medium flex-shrink-0',
        isOwn ? 'text-primary' : 'text-secondary'
      ]"
    >
      &lt;<template v-if="displayNameParts">
        <template v-for="(part, idx) in displayNameParts" :key="idx">
          <mark
            v-if="part.isMatch"
            class="bg-yellow-400/30 text-[var(--text-primary)] rounded px-0.5"
          >{{ part.text }}</mark>
          <span v-else>{{ part.text }}</span>
        </template>
      </template><template v-else>{{ displayName }}</template>&gt;
    </span>

    <!-- Message content -->
    <span class="flex-1 break-words text-[var(--text-primary)]">
      <!-- Reply quote (inline) -->
      <span v-if="message.replyTo" class="text-[var(--text-muted)] text-sm mr-1">
        <Icon name="heroicons:arrow-uturn-left" class="w-3 h-3 inline -mt-0.5" />
        {{ message.replyTo.user?.firstName }}:
        {{ truncateText(message.replyTo.content, 25) }} —
      </span>

      <!-- Content -->
      <span v-if="message.isDeleted" class="italic text-[var(--text-muted)]">Сообщение удалено</span>
      <template v-else>
        <!-- Image -->
        <template v-if="message.contentType === 'image' && message.imageUrl">
          <a :href="message.imageUrl" target="_blank" class="text-primary hover:underline">
            [изображение]
          </a>
          <span v-if="message.content" class="ml-1 whitespace-pre-wrap">
            <template v-if="contentParts">
              <template v-for="(part, idx) in contentParts" :key="idx">
                <mark
                  v-if="part.isMatch"
                  class="bg-yellow-400/30 text-[var(--text-primary)] rounded px-0.5"
                >{{ part.text }}</mark>
                <span v-else>{{ part.text }}</span>
              </template>
            </template>
            <template v-else>{{ message.content }}</template>
          </span>
        </template>
        <!-- Text only -->
        <span v-else class="whitespace-pre-wrap">
          <template v-if="contentParts">
            <template v-for="(part, idx) in contentParts" :key="idx">
              <mark
                v-if="part.isMatch"
                class="bg-yellow-400/30 text-[var(--text-primary)] rounded px-0.5"
              >{{ part.text }}</mark>
              <span v-else>{{ part.text }}</span>
            </template>
          </template>
          <template v-else>{{ message.content }}</template>
        </span>
      </template>

      <!-- Pinned badge -->
      <Icon
        v-if="message.isPinned"
        name="heroicons:bookmark-solid"
        class="inline w-3 h-3 text-yellow-400 ml-1"
        title="Закреплено"
      />

      <!-- Status indicators -->
      <Icon
        v-if="message.status === 'sending'"
        name="heroicons:arrow-path"
        class="inline w-3 h-3 animate-spin ml-1 text-[var(--text-muted)]"
      />
      <span v-if="message.status === 'failed'" class="text-xs text-red-400 ml-2">
        <Icon name="heroicons:exclamation-circle" class="inline w-3 h-3" />
        не отправлено
        <button
          @click.stop="emit('retry', String(message.id))"
          class="underline hover:no-underline ml-1"
        >
          повторить
        </button>
      </span>
    </span>

    <!-- Moderator badge -->
    <span
      v-if="isUserModerator"
      class="text-[10px] text-yellow-400 bg-yellow-400/10 px-1 rounded flex-shrink-0"
      title="Модератор"
    >MOD</span>
  </div>
</template>
