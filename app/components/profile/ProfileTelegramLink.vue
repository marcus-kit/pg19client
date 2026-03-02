<script setup lang="ts">
/**
 * ProfileTelegramLink — привязка Telegram к аккаунту
 *
 * Использует OIDC (oauth.telegram.org) — тот же метод, что и вход.
 * Позволяет привязать или перепривязать Telegram.
 */

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const userStore = useUserStore()
const route = useRoute()

const isLinking = ref(false)

// =============================================================================
// COMPUTED
// =============================================================================

const isLinked = computed(() => !!userStore.user?.telegramId)
const telegramUsername = computed(() => userStore.user?.telegram || '')

// =============================================================================
// METHODS
// =============================================================================

// Запуск привязки через OIDC
function startLink(): void {
  if (!userStore.user?.id) return
  isLinking.value = true
  window.location.href = '/api/auth/telegram/authorize?purpose=link'
}

// =============================================================================
// LIFECYCLE & WATCHERS
// =============================================================================

onMounted(async () => {
  // Успешная привязка — обновить store из API
  if (route.query.telegram_linked === '1') {
    try {
      const user = await $fetch<{ telegramId: string | null; telegram: string }>('/api/user/me')
      userStore.updateUser({ telegramId: user.telegramId, telegram: user.telegram })
    } catch {
      // ignore
    }
    navigateTo({ path: '/profile', query: {} }, { replace: true })
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
    <div v-if="isLinked" class="space-y-4">
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
        Если вход через Telegram не работает, нажмите «Перепривязать» — это обновит привязку на новый метод OAuth.
      </p>
      <UiButton
        variant="secondary"
        size="sm"
        :loading="isLinking"
        @click="startLink"
      >
        <Icon name="simple-icons:telegram" class="w-4 h-4 mr-1" />
        Перепривязать Telegram
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

      <!-- Ошибка из query -->
      <p v-if="route.query?.error" class="text-sm text-red-400">
        {{ decodeURIComponent(String(route.query.error)) }}
      </p>
    </div>
  </UiCard>
</template>
