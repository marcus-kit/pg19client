<script setup lang="ts">
/**
 * ProfileContractInfo — информация о договоре
 *
 * Отображает номер договора, статус, тариф и дату заключения.
 * При отсутствии активного договора (account === null) показывает «Нет активного договора» и прочерки.
 */
import { formatDate } from '~/composables/useFormatters'

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const accountStore = useAccountStore()

// Статус и вариант бейджа: нет договора / приостановлен / активен
const contractStatus = computed(() => {
  if (!accountStore.account) {
    return { text: 'Нет активного договора', variant: 'neutral' as const }
  }
  if (accountStore.isBlocked) {
    return { text: 'Приостановлен', variant: 'danger' as const }
  }
  return { text: 'Активен', variant: 'success' as const }
})
</script>

<template>
  <UiCard>
    <div class="flex items-center justify-between mb-3 md:mb-5">
      <h2 class="text-base md:text-lg font-semibold text-[var(--text-primary)]">Договор</h2>
    </div>

    <div class="space-y-2 md:space-y-4">
      <div class="flex items-center justify-between py-2 md:py-3" style="border-bottom: 1px solid var(--glass-border);">
        <span class="text-xs md:text-sm text-[var(--text-muted)]">Номер договора</span>
        <span class="text-xs md:text-base text-[var(--text-primary)] font-medium">{{ accountStore.account?.contractNumber ?? '—' }}</span>
      </div>
      <div class="flex items-center justify-between py-2 md:py-3" style="border-bottom: 1px solid var(--glass-border);">
        <span class="text-xs md:text-sm text-[var(--text-muted)]">Статус</span>
        <UiBadge :variant="contractStatus.variant" class="text-[10px] md:text-xs">
          {{ contractStatus.text }}
        </UiBadge>
      </div>
      <div class="flex items-center justify-between py-2 md:py-3" style="border-bottom: 1px solid var(--glass-border);">
        <span class="text-xs md:text-sm text-[var(--text-muted)]">Тариф</span>
        <span class="text-xs md:text-base text-[var(--text-primary)]">{{ accountStore.account?.tariff ?? '—' }}</span>
      </div>
      <div class="flex items-center justify-between py-2 md:py-3">
        <span class="text-xs md:text-sm text-[var(--text-muted)]">Дата заключения</span>
        <span class="text-xs md:text-base text-[var(--text-primary)]">{{ accountStore.account ? (formatDate(accountStore.account.startDate || '') || '—') : '—' }}</span>
      </div>
    </div>
  </UiCard>
</template>
