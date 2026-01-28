<script setup lang="ts">
/**
 * CommunityMessage — сообщение в чате «Соседи»
 *
 * Особенности:
 * - Аватар и имя слева (или группировка при подряд идущих от одного пользователя)
 * - Превью изображений, ответы, удалённые сообщения
 * - Статусы отправки: sending, failed, retry
 * - Контекстное меню по ПКМ
 */
import type { CommunityMessage } from '~/types/community'

// =============================================================================
// PROPS & EMIT
// =============================================================================

const props = withDefaults(
  defineProps<{
    message: CommunityMessage
    isOwn: boolean
    showModeration?: boolean
    isUserModerator?: boolean
    highlight?: string
    /** Показывать аватар и имя отправителя (false для подряд идущих от одного пользователя) */
    showAuthorHeader?: boolean
  }>(),
  { showAuthorHeader: true }
)

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

const avatarUrl = computed(() => props.message.user?.avatar || null)

const isEdited = computed(() => {
  if (props.message.isDeleted) return false
  const created = new Date(props.message.createdAt).getTime()
  const updated = new Date(props.message.updatedAt).getTime()
  if (!Number.isFinite(created) || !Number.isFinite(updated)) return false
  // небольшой порог, чтобы не считать insert как "редактирование"
  return updated - created > 1500
})

const initials = computed(() => {
  const name = (displayName.value || '').trim()
  if (!name) return '?'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
})

type HighlightPart = { text: string; isMatch: boolean }

const highlightQuery = computed(() => (props.highlight || '').trim())
const canHighlight = computed(() => highlightQuery.value.length >= 2 && !props.message.isDeleted)

const markClass = computed(() => {
  return props.isOwn
    ? 'bg-yellow-200/25 text-white rounded px-0.5'
    : 'bg-yellow-400/30 text-[var(--text-primary)] rounded px-0.5'
})

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
    class="px-3 py-1.5"
    :class="[!isOwn && !showAuthorHeader && 'pt-0.5']"
    @contextmenu.prevent="handleContextMenu"
  >
    <div :class="['flex gap-2', isOwn ? 'justify-end' : 'justify-start']">
      <!-- Колонка аватара (только для чужих сообщений, для выравнивания группировки) -->
      <div v-if="!isOwn" class="w-8 flex-shrink-0 flex flex-col items-center pt-0.5">
        <div
          v-if="showAuthorHeader"
          class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ring-2 ring-white/10"
          style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
          aria-hidden="true"
        >
          <img v-if="avatarUrl" :src="avatarUrl" alt="" class="w-full h-full object-cover" />
          <span v-else class="text-xs font-semibold text-[var(--text-muted)]">{{ initials }}</span>
        </div>
      </div>

      <!-- Пузырёк сообщения -->
      <div
        :class="[
          'rounded-2xl px-4 py-2.5 border min-w-0 max-w-[85%]',
          isOwn
            ? 'bg-primary/90 text-white border-primary/30'
            : 'bg-[var(--card-bg)] text-[var(--text-primary)] border-white/10',
          message.isDeleted && 'opacity-60',
          message.status === 'sending' && 'opacity-70',
          message.status === 'failed' && 'border-red-500/30 bg-red-500/10'
        ]"
      >
        <!-- Имя отправителя (только для чужих и при showAuthorHeader) -->
        <div
          v-if="!isOwn && showAuthorHeader"
          class="flex items-center gap-2 mb-1.5 min-w-0"
        >
          <span class="text-sm font-semibold truncate text-[var(--text-secondary)]">
            <template v-if="displayNameParts">
              <template v-for="(p, idx) in displayNameParts" :key="idx">
                <mark v-if="p.isMatch" :class="markClass">{{ p.text }}</mark>
                <span v-else>{{ p.text }}</span>
              </template>
            </template>
            <template v-else>{{ displayName }}</template>
          </span>
          <span
            v-if="isUserModerator"
            class="text-[10px] text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded font-medium"
            title="Модератор"
          >MOD</span>
        </div>

        <!-- Цитата ответа -->
        <div
          v-if="message.replyTo && !message.isDeleted"
          class="flex items-start gap-1.5 text-xs mb-2 pl-2 pr-2 py-1.5 rounded-lg border-l-2"
          :class="isOwn ? 'bg-white/15 text-white/90 border-primary/50' : 'bg-black/10 text-[var(--text-muted)] border-white/20'"
        >
          <Icon name="heroicons:arrow-uturn-left" class="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-70" />
          <span>
            <span class="font-medium" :class="isOwn ? 'text-white/90' : 'text-[var(--text-secondary)]'">{{ message.replyTo.user?.firstName || message.replyTo.user?.nickname || 'Пользователь' }}:</span>
            {{ truncateText(message.replyTo.content, 80) }}
          </span>
        </div>

        <!-- Контент -->
        <div class="text-[15px] leading-snug whitespace-pre-wrap break-words" :class="isOwn ? 'text-white' : 'text-[var(--text-primary)]'">
          <span v-if="message.isDeleted" class="italic opacity-80" :class="isOwn ? 'text-white/80' : 'text-[var(--text-muted)]'">
            Сообщение удалено
          </span>
          <template v-else>
            <!-- Изображение с превью -->
            <template v-if="message.contentType === 'image' && message.imageUrl">
              <a
                :href="message.imageUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="block rounded-xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <img
                  :src="message.imageUrl"
                  :alt="message.content || 'Изображение'"
                  class="max-w-full max-h-64 w-auto h-auto object-contain rounded-xl"
                  loading="lazy"
                />
              </a>
              <p v-if="message.content" class="mt-1.5 text-sm" :class="isOwn ? 'text-white/90' : 'text-[var(--text-secondary)]'">
                <template v-if="contentParts">
                  <template v-for="(part, idx) in contentParts" :key="idx">
                    <mark v-if="part.isMatch" :class="markClass">{{ part.text }}</mark>
                    <span v-else>{{ part.text }}</span>
                  </template>
                </template>
                <template v-else>{{ message.content }}</template>
              </p>
            </template>
            <!-- Только текст -->
            <template v-else>
              <template v-if="contentParts">
                <template v-for="(part, idx) in contentParts" :key="idx">
                  <mark v-if="part.isMatch" :class="markClass">{{ part.text }}</mark>
                  <span v-else>{{ part.text }}</span>
                </template>
              </template>
              <template v-else>{{ message.content }}</template>
            </template>
          </template>
        </div>

        <!-- Время и индикаторы внизу -->
        <div class="flex items-center justify-end gap-2 mt-1.5 flex-wrap">
          <div class="flex items-center gap-1.5">
            <Icon
              v-if="message.isPinned"
              name="heroicons:bookmark-solid"
              class="w-3.5 h-3.5"
              :class="isOwn ? 'text-amber-200' : 'text-amber-400'"
              title="Закреплено"
            />
            <Icon
              v-if="message.status === 'sending'"
              name="heroicons:arrow-path"
              class="w-3.5 h-3.5 animate-spin"
              :class="isOwn ? 'text-white/70' : 'text-[var(--text-muted)]'"
              title="Отправляется"
            />
          </div>
          <span
            v-if="isEdited"
            class="text-[11px] tabular-nums opacity-70"
            :class="isOwn ? 'text-white/70' : 'text-[var(--text-muted)]'"
            title="Сообщение отредактировано"
          >
            ред.
          </span>
          <span class="text-[11px] tabular-nums opacity-70" :class="isOwn ? 'text-white/70' : 'text-[var(--text-muted)]'">
            {{ formattedTime }}
          </span>
        </div>

        <!-- Ошибка отправки -->
        <div v-if="message.status === 'failed'" class="mt-2 text-xs flex items-center gap-1" :class="isOwn ? 'text-red-200' : 'text-red-400'">
          <Icon name="heroicons:exclamation-circle" class="w-3.5 h-3.5 flex-shrink-0" />
          <span>Не отправлено.</span>
          <button
            type="button"
            @click.stop="emit('retry', String(message.id))"
            class="underline hover:no-underline font-medium"
          >
            Повторить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
