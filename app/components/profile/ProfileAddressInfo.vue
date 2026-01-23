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
    <div class="flex items-center justify-between mb-5">
      <h2 class="text-lg font-semibold text-[var(--text-primary)]">Адрес подключения</h2>
    </div>

    <div class="flex items-start gap-4">
      <div class="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10">
        <Icon name="heroicons:map-pin" class="w-6 h-6 text-primary" />
      </div>
      <div>
        <p class="text-[var(--text-primary)]">{{ accountStore.account?.address }}</p>
        <p class="text-sm text-[var(--text-muted)] mt-1">Адрес предоставления услуг</p>
      </div>
    </div>
  </UiCard>
</template>
