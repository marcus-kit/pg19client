<script setup lang="ts">
/**
 * ProfileTelegramLink — привязка Telegram к аккаунту
 *
 * Особенности:
 * - Deeplink авторизация (purpose: 'link')
 * - Таймер ожидания подтверждения
 * - Автообновление store после привязки
 */

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const userStore = useUserStore()

const {
  isLoading,
  error,
  status,
  deeplink,
  remainingSeconds,
  verifiedData,
  botUsername,
  requestAuth,
  reset
} = useTelegramDeeplink()

// =============================================================================
// COMPUTED
// =============================================================================

const isLinked = computed(() => !!userStore.user?.telegramId)
const telegramUsername = computed(() => userStore.user?.telegram || '')

// =============================================================================
// METHODS
// =============================================================================

// Запуск привязки Telegram
async function startLink(): Promise<void> {
  if (!userStore.user?.id) return
  await requestAuth('link', userStore.user.id)
}

// =============================================================================
// LIFECYCLE
// =============================================================================

onUnmounted(() => {
  reset()
})

// =============================================================================
// WATCHERS
// =============================================================================

// Обновление store после успешной привязки
watch(status, (newStatus) => {
  if (newStatus === 'verified' && verifiedData.value) {
    const data = verifiedData.value as any
    if (data.telegramId) {
      userStore.updateUser({
        telegramId: data.telegramId,
        telegram: data.telegramUsername ? `@${data.telegramUsername}` : ''
      })
    }
  }
})
</script>

<template>
  <UiCard>
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-lg font-semibold text-[var(--text-primary)]">Telegram</h2>
      <UiBadge v-if="isLinked" variant="success" size="sm">
        <Icon name="heroicons:check" class="w-3 h-3 mr-1" />
        Привязан
      </UiBadge>
    </div>

    <!-- Telegram привязан -->
    <div v-if="isLinked" class="flex items-center gap-4">
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

    <!-- Telegram не привязан -->
    <div v-else class="space-y-4">
      <!-- Шаг 1: Начальный экран -->
      <template v-if="status === 'idle'">
        <p class="text-sm text-[var(--text-muted)]">
          Привяжите Telegram для быстрого входа в личный кабинет
        </p>

        <UiButton
          variant="primary"
          block
          :loading="isLoading"
          class="!bg-[#0088cc] hover:!bg-[#0077b5]"
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
      </template>

      <!-- Шаг 2: Ожидание подтверждения -->
      <template v-else-if="status === 'waiting'">
        <div class="text-center">
          <p class="text-[var(--text-muted)] mb-4">
            Откройте Telegram и нажмите Start
          </p>

          <!-- Кнопка-ссылка -->
          <a
            :href="deeplink"
            target="_blank"
            class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white bg-[#0088cc] hover:bg-[#0077b5] transition-colors mb-4"
          >
            <Icon name="simple-icons:telegram" class="w-5 h-5" />
            Открыть @{{ botUsername }}
          </a>

          <!-- Таймер -->
          <div class="flex items-center justify-center gap-2 text-[var(--text-muted)] mb-4">
            <Icon name="heroicons:clock" class="w-5 h-5" />
            <span class="font-mono">{{ Math.floor(remainingSeconds / 60) }}:{{ String(remainingSeconds % 60).padStart(2, '0') }}</span>
          </div>

          <!-- Анимация -->
          <div class="relative w-16 h-16 mx-auto mb-4">
            <div class="absolute inset-0 rounded-full border-4 border-[#0088cc]/20"></div>
            <div class="absolute inset-0 rounded-full border-4 border-[#0088cc] border-t-transparent animate-spin"></div>
            <Icon name="simple-icons:telegram" class="absolute inset-0 m-auto w-6 h-6 text-[#0088cc]" />
          </div>

          <button
            @click="reset"
            class="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Отмена
          </button>
        </div>
      </template>

      <!-- Шаг 3: Успех -->
      <template v-else-if="status === 'verified'">
        <div class="text-center py-4">
          <Icon name="heroicons:check-circle" class="w-12 h-12 text-accent mx-auto mb-3" />
          <p class="text-lg font-medium text-[var(--text-primary)]">Telegram привязан!</p>
        </div>
      </template>

      <!-- Шаг 4: Истекло -->
      <template v-else-if="status === 'expired'">
        <div class="text-center py-4">
          <Icon name="heroicons:x-circle" class="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p class="font-medium text-[var(--text-primary)] mb-3">Время истекло</p>
          <UiButton variant="primary" size="sm" @click="reset">
            Попробовать снова
          </UiButton>
        </div>
      </template>

      <!-- Error Message -->
      <div v-if="error" class="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm flex items-center gap-2">
        <Icon name="heroicons:exclamation-circle" class="w-5 h-5" />
        {{ error }}
      </div>
    </div>
  </UiCard>
</template>
