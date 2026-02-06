<script setup lang="ts">
/**
 * DashboardInvoicesBlock — большой блок подключенных счетов
 *
 * Показывает последние счета с возможностью перейти к оплате или на страницу всех счетов.
 */
import type { InvoiceStatus } from '~/types/invoice'
import { invoiceStatusLabels, invoiceStatusColors, formatInvoicePeriod } from '~/types/invoice'
import { formatKopeks, formatDateShort } from '~/composables/useFormatters'

// =============================================================================
// DATA
// =============================================================================

const { fetchInvoices } = useInvoices()
const { invoices, pending, error, refresh } = await fetchInvoices({ limit: 6 })

// =============================================================================
// CONSTANTS
// =============================================================================

const unpaidStatuses: InvoiceStatus[] = ['pending', 'sent', 'viewed', 'expired']

function getStatusBadgeClass(status: InvoiceStatus): string {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-600/20 text-gray-400',
    primary: 'bg-primary/20 text-primary',
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-accent/20 text-accent',
    red: 'bg-red-500/20 text-red-400'
  }
  const color = invoiceStatusColors[status] as string
  return (color in colorMap ? colorMap[color] : colorMap.gray) as string
}

function isUnpaid(status: InvoiceStatus): boolean {
  return unpaidStatuses.includes(status)
}

function openInvoice(invoiceId: string): void {
  window.open(`https://invoice.doka.team/invoice/${invoiceId}`, '_blank')
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-base md:text-lg font-semibold text-[var(--text-primary)]">Подключенные счета</h2>
      <NuxtLink
        to="/invoices"
        class="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
      >
        Все счета
        <Icon name="heroicons:arrow-right" class="w-4 h-4" />
      </NuxtLink>
    </div>

    <UiCard class="p-0 overflow-hidden" padding="none">
      <!-- Loading -->
      <div v-if="pending" class="p-4 md:p-6 space-y-4">
        <div v-for="i in 4" :key="i" class="flex items-center gap-4 animate-pulse">
          <div class="w-12 h-12 rounded-xl bg-[var(--glass-bg)]" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-[var(--glass-bg)] rounded w-1/3" />
            <div class="h-3 bg-[var(--glass-bg)] rounded w-1/2" />
          </div>
          <div class="h-5 bg-[var(--glass-bg)] rounded w-16" />
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="p-6 text-center">
        <Icon name="heroicons:exclamation-triangle" class="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p class="text-sm text-red-400 mb-4">Не удалось загрузить счета</p>
        <UiButton size="sm" variant="secondary" @click="refresh">Повторить</UiButton>
      </div>

      <!-- Empty -->
      <div v-else-if="invoices.length === 0" class="p-6 md:p-8 text-center">
        <div class="w-14 h-14 rounded-2xl bg-[var(--glass-bg)] flex items-center justify-center mx-auto mb-4">
          <Icon name="heroicons:document-text" class="w-7 h-7 text-[var(--text-muted)]" />
        </div>
        <p class="text-sm text-[var(--text-muted)]">Счетов пока нет</p>
        <p class="text-xs text-[var(--text-muted)] mt-1">Счета появятся после выставления</p>
      </div>

      <!-- Invoices list -->
      <div v-else class="divide-y" style="border-color: var(--glass-border);">
        <button
          v-for="invoice in invoices"
          :key="invoice.id"
          type="button"
          class="w-full px-4 md:px-6 py-4 md:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-white/5 transition-colors"
          @click="openInvoice(invoice.id)"
        >
          <div class="flex items-start gap-4 min-w-0">
            <div
              class="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
              :class="invoice.status === 'paid'
                ? 'bg-accent/20'
                : isUnpaid(invoice.status)
                  ? 'bg-primary/20'
                  : 'bg-[var(--glass-bg)]'"
            >
              <Icon
                :name="invoice.status === 'paid' ? 'heroicons:check-circle' : 'heroicons:document-text'"
                class="w-6 h-6"
                :class="invoice.status === 'paid' ? 'text-accent' : isUnpaid(invoice.status) ? 'text-primary' : 'text-[var(--text-muted)]'"
              />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="text-xs text-[var(--text-muted)]">{{ invoice.invoiceNumber }}</span>
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium"
                  :class="getStatusBadgeClass(invoice.status)"
                >
                  {{ invoiceStatusLabels[invoice.status] }}
                </span>
              </div>
              <p class="font-medium text-[var(--text-primary)]">{{ formatInvoicePeriod(invoice) }}</p>
              <div class="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                <span v-if="invoice.issuedAt">Выставлен: {{ formatDateShort(invoice.issuedAt) }}</span>
                <span v-if="invoice.paidAt">Оплачен: {{ formatDateShort(invoice.paidAt) }}</span>
                <span v-else-if="invoice.dueDate">Срок: {{ formatDateShort(invoice.dueDate) }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <span
              class="text-lg md:text-xl font-bold"
              :class="isUnpaid(invoice.status) ? 'text-primary' : 'text-[var(--text-primary)]'"
            >
              {{ formatKopeks(invoice.amount) }}
              <span class="text-sm font-normal text-[var(--text-muted)]">₽</span>
            </span>
            <Icon name="heroicons:chevron-right" class="w-5 h-5 text-[var(--text-muted)]" />
          </div>
        </button>
      </div>
    </UiCard>
  </section>
</template>
