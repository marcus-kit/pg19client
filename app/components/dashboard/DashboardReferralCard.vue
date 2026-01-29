<script setup lang="ts">
/**
 * DashboardReferralCard — промо-карточка реферальной программы
 *
 * Компактная карточка с промокодом и кнопкой копирования.
 * Ссылка на полную информацию в профиле.
 */

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const referralStore = useReferralStore()

// =============================================================================
// STATE — реактивное состояние
// =============================================================================

const copySuccess = ref(false)

// =============================================================================
// METHODS
// =============================================================================

// Копировать промокод
async function copyCode(): Promise<void> {
  const code = referralStore.referralProgram?.code
  if (!code) return

  try {
    await navigator.clipboard.writeText(code)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch {
    // Fallback для старых браузеров
    const input = document.createElement('input')
    input.value = code
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }
}
</script>

<template>
  <UiCard class="border-accent/30 bg-gradient-to-r from-accent/10 to-primary/5">
    <div class="flex items-center gap-4">
      <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
        <Icon name="heroicons:gift" class="w-6 h-6 text-white" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-sm font-medium text-[var(--text-primary)]">Ваш промокод</span>
          <UiBadge variant="success" size="sm" class="hidden md:inline-flex">+300 ₽</UiBadge>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xl font-bold text-[var(--text-primary)] tracking-wider">
            {{ referralStore.referralProgram?.code || '...' }}
          </span>
          <button
            class="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            @click="copyCode"
          >
            <Icon
              :name="copySuccess ? 'heroicons:check' : 'heroicons:clipboard-document'"
              :class="['w-4 h-4', copySuccess ? 'text-accent' : 'text-[var(--text-muted)]']"
            />
          </button>
        </div>
      </div>
      <div class="flex-shrink-0 flex flex-col md:block items-end md:items-center gap-2">
        <UiBadge variant="success" size="sm" class="md:hidden">+300 ₽</UiBadge>
        <NuxtLink to="/profile">
          <UiButton size="sm" variant="secondary">
            Подробнее
          </UiButton>
        </NuxtLink>
      </div>
    </div>
  </UiCard>
</template>
