<script setup lang="ts">
/**
 * CommunityPinnedMessages — баннер закреплённых сообщений
 *
 * Особенности:
 * - Карусель при нескольких закреплённых
 * - Индикатор текущего/всего
 * - Кнопка переключения
 */
import type { CommunityMessage } from '~/types/community'

// =============================================================================
// PROPS & EMIT
// =============================================================================

const props = defineProps<{
  messages: CommunityMessage[]
}>()

// =============================================================================
// STATE — реактивное состояние
// =============================================================================

const currentIndex = ref(0)

// =============================================================================
// COMPUTED
// =============================================================================

const currentMessage = computed(() => props.messages[currentIndex.value])

// =============================================================================
// METHODS
// =============================================================================

// Переключить на следующее сообщение
function next(): void {
  currentIndex.value = (currentIndex.value + 1) % props.messages.length
}
</script>

<template>
  <div
    v-if="messages.length"
    class="px-3 py-1.5 bg-yellow-500/10 text-sm flex items-center gap-2 border-b border-white/5"
  >
    <Icon name="heroicons:bookmark-solid" class="w-4 h-4 text-yellow-400 flex-shrink-0" />

    <span class="flex-1 truncate text-[var(--text-primary)]">
      <span class="text-yellow-400 font-medium">{{ currentMessage?.user?.firstName }}:</span>
      {{ currentMessage?.content }}
    </span>

    <span v-if="messages.length > 1" class="text-xs text-[var(--text-muted)] flex-shrink-0">
      {{ currentIndex + 1 }}/{{ messages.length }}
    </span>

    <button
      v-if="messages.length > 1"
      @click="next"
      class="p-1 hover:bg-white/10 rounded flex-shrink-0"
      title="Следующее"
    >
      <Icon name="heroicons:chevron-right" class="w-4 h-4 text-[var(--text-muted)]" />
    </button>
  </div>
</template>
