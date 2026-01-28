<script setup lang="ts">
/**
 * ProfileAddressInfo — карточка адреса подключения
 *
 * Минимальный компонент — только отображение адреса из accountStore.
 */

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const accountStore = useAccountStore()
</script>

<template>
  <UiCard>
    <div class="flex items-center justify-between mb-3 md:mb-5">
      <h2 class="text-base md:text-lg font-semibold text-[var(--text-primary)]">Адрес подключения</h2>
    </div>

    <div class="flex items-start gap-2 md:gap-4">
      <div class="p-2 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 flex-shrink-0">
        <Icon name="heroicons:map-pin" class="w-4 h-4 md:w-6 md:h-6 text-primary" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-xs md:text-base text-[var(--text-primary)] break-words">{{ accountStore.account?.address }}</p>
        <p class="text-[10px] md:text-sm text-[var(--text-muted)] mt-0.5 md:mt-1">Адрес предоставления услуг</p>
      </div>
    </div>
  </UiCard>
</template>
