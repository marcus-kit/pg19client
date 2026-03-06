<script setup lang="ts">
/**
 * ProfileTelegramLink — привязка Telegram к аккаунту
 *
 * Использует Deeplink (t.me/bot?start=AUTH_xxx) — тот же метод, что и вход.
 * Позволяет привязать или перепривязать Telegram.
 */

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const userStore = useUserStore()
const {
  isLoading: isLinking,
  error: linkError,
  status: linkStatus,
  deeplink,
  remainingSeconds,
  verifiedData,
  requestAuth,
  reset
} = useTelegramDeeplink()

// =============================================================================
// COMPUTED
// =============================================================================

const isLinked = computed(() => !!userStore.user?.telegramId)
const telegramUsername = computed(() => userStore.user?.telegram || '')

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = String(seconds % 60).padStart(2, '0')
  return `${mins}:${secs}`
}

const linkTimer = computed(() => formatTimer(remainingSeconds.value))

// =============================================================================
// METHODS
// =============================================================================

async function startLink(): Promise<void> {
  if (!userStore.user?.id) return
  try {
    await requestAuth('link', userStore.user.id)
  } catch {
    // ошибка уже в linkError из composable
  }
}

// =============================================================================
// WATCHERS
// =============================================================================

watch(linkStatus, (newStatus) => {
  if (newStatus === 'verified' && verifiedData.value && 'telegramId' in verifiedData.value) {
    const data = verifiedData.value
    userStore.updateUser({
      telegramId: data.telegramId,
      telegram: data.telegramUsername ? `@${data.telegramUsername}` : ''
    })
    reset()
  }
})
</script>

<template>
  <UiCard>
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-lg font-semibold text-[var(--text-primary)]">Telegram</h2>
      <UiBadge v-if="isLinked && linkStatus !== 'waiting'" variant="success" size="sm">
        <Icon name="heroicons:check" class="w-3 h-3 mr-1" />
        Привязан
      </UiBadge>
    </div>

    <!-- Telegram привязан -->
    <div v-if="isLinked && linkStatus !== 'waiting'" class="space-y-4">
      <div class="flex items-center gap-4">
        <div class="p-3 rounded-xl bg-[#0088cc]/10">
          <Icon name="simple-icons:telegram" class="w-8 h-8 text-[#0088cc]" />
        </div>
        <div>
          <p class="text-[var(--text-primary)] font-medium">{{ telegramUsername || 'Привязан' }}</p>
          <p class="text-sm text-[var(--text-muted)]">
            Вы можете входить в личный кабинет через Telegram
          </p>
        </div>
      </div>
      <p class="text-sm text-[var(--text-muted)]">
        Если вход через Telegram не работает, нажмите «Перепривязать» — это обновит привязку.
      </p>
      <UiButton
        variant="secondary"
        size="sm"
        :loading="isLinking"
        :disabled="linkStatus === 'waiting'"
        @click="startLink"
      >
        <Icon name="simple-icons:telegram" class="w-4 h-4 mr-1" />
        Перепривязать Telegram
      </UiButton>
    </div>

    <!-- Ожидание подтверждения в Telegram -->
    <div v-else-if="linkStatus === 'waiting'" class="space-y-4">
      <p class="text-sm text-[var(--text-muted)]">
        Откройте Telegram и нажмите <strong>Start</strong> в чате с ботом
      </p>
      <a
        v-if="deeplink"
        :href="deeplink"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white transition-all hover:opacity-90"
        style="background: #0088cc;"
      >
        <Icon name="simple-icons:telegram" class="w-5 h-5" />
        Открыть Telegram
      </a>
      <div class="flex items-center gap-2 text-[var(--text-muted)]">
        <Icon name="heroicons:clock" class="w-5 h-5" />
        <span class="font-mono">{{ linkTimer }}</span>
      </div>
      <button
        @click="reset"
        class="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        Отмена
      </button>
    </div>

    <!-- Время истекло -->
    <div v-else-if="linkStatus === 'expired'" class="space-y-4">
      <p class="text-sm text-[var(--text-muted)]">Время для привязки истекло.</p>
      <UiButton variant="primary" @click="reset">
        Попробовать снова
      </UiButton>
    </div>

    <!-- Telegram не привязан -->
    <div v-else class="space-y-4">
      <p class="text-sm text-[var(--text-muted)]">
        Привяжите Telegram для быстрого входа в личный кабинет
      </p>

      <UiButton
        variant="primary"
        block
        :loading="isLinking"
        @click="startLink"
      >
        <Icon name="simple-icons:telegram" class="w-5 h-5 mr-2" />
        Привязать Telegram
      </UiButton>

      <!-- Benefits -->
      <div class="p-4 rounded-lg space-y-2" style="background: var(--glass-bg);">
        <p class="text-sm font-medium text-[var(--text-primary)]">Преимущества:</p>
        <ul class="text-sm text-[var(--text-muted)] space-y-1">
          <li class="flex items-center gap-2">
            <Icon name="heroicons:bolt" class="w-4 h-4 text-primary" />
            Мгновенный вход без пароля
          </li>
          <li class="flex items-center gap-2">
            <Icon name="heroicons:bell" class="w-4 h-4 text-primary" />
            Уведомления в Telegram
          </li>
          <li class="flex items-center gap-2">
            <Icon name="heroicons:shield-check" class="w-4 h-4 text-primary" />
            Двухфакторная защита
          </li>
        </ul>
      </div>
    </div>

    <!-- Ошибка -->
    <p v-if="linkError" class="mt-4 text-sm text-red-400">
      {{ linkError }}
    </p>
  </UiCard>
</template>
