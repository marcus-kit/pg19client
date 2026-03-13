<script setup lang="ts">
/**
 * ProfileAddressInfo — карточка адресов подключения
 *
 * Показывает все уникальные адреса из услуг договора (addresses),
 * с фолбэком на единственный address из accountStore.
 */

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const accountStore = useAccountStore()

const addresses = computed(() => {
  const list = accountStore.account?.addresses
  if (list && list.length > 0) return list
  const single = accountStore.account?.address
  return single ? [single] : []
})
</script>

<template>
  <UiCard>
    <div class="flex items-center justify-between mb-3 md:mb-5">
      <h2 class="text-base md:text-lg font-semibold text-[var(--text-primary)]">
        {{ addresses.length > 1 ? 'Адреса подключения' : 'Адрес подключения' }}
      </h2>
    </div>

    <div v-if="addresses.length === 0" class="text-xs md:text-sm text-[var(--text-muted)]">
      Нет данных об адресах
    </div>

    <div v-for="(addr, i) in addresses" :key="i" class="flex items-start gap-2 md:gap-4" :class="{ 'mt-3 md:mt-4 pt-3 md:pt-4': i > 0 }" :style="i > 0 ? 'border-top: 1px solid var(--glass-border)' : ''">
      <div class="p-2 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 flex-shrink-0">
        <Icon name="heroicons:map-pin" class="w-4 h-4 md:w-6 md:h-6 text-primary" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-xs md:text-base text-[var(--text-primary)] break-words">{{ addr }}</p>
        <p class="text-[10px] md:text-sm text-[var(--text-muted)] mt-0.5 md:mt-1">Адрес предоставления услуг</p>
      </div>
    </div>
  </UiCard>
</template>
