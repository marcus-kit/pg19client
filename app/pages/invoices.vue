<script setup lang="ts">
/**
 * Страница счетов — история выставленных счетов:
 * - Фильтрация: все / к оплате / оплаченные
 * - Клик по счёту открывает его на invoice.doka.team
 *
 * Статусы счетов:
 * - pending, sent, viewed — неоплаченные
 * - paid — оплаченный
 * - expired — просроченный
 */
import type { InvoiceStatus } from '~/types/invoice'
import { invoiceStatusLabels, invoiceStatusColors, formatInvoicePeriod } from '~/types/invoice'
import { formatKopeks, formatDateShort } from '~/composables/useFormatters'

definePageMeta({
  middleware: 'auth'
})

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const { fetchInvoices } = useInvoices()

// =============================================================================
// DATA — загрузка счетов
// =============================================================================

const { invoices, pending, error, refresh } = await fetchInvoices()

// =============================================================================
// STATE — фильтр
// =============================================================================

const filter = ref<'all' | 'unpaid' | 'paid'>('all')

// =============================================================================
// COMPUTED
// =============================================================================

// Отфильтрованный список счетов
const filteredInvoices = computed(() => {
  if (filter.value === 'unpaid') {
    return invoices.value.filter(inv => unpaidStatuses.includes(inv.status))
  }
  if (filter.value === 'paid') {
    return invoices.value.filter(inv => inv.status === 'paid')
  }
  return invoices.value
})

// =============================================================================
// CONSTANTS
// =============================================================================

// Статусы неоплаченных счетов
const unpaidStatuses = ['pending', 'sent', 'viewed', 'expired']

// Опции фильтра
const filters = [
  { value: 'all', label: 'Все' },
  { value: 'unpaid', label: 'К оплате' },
  { value: 'paid', label: 'Оплаченные' }
]

// =============================================================================
// METHODS
// =============================================================================

// Открыть счёт в новой вкладке (на invoice.doka.team)
function openInvoice(invoiceId: string): void {
  window.open(`https://invoice.doka.team/invoice/${invoiceId}`, '_blank')
}

// Получить CSS-класс для бейджа статуса
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
</script>

<template>
  <div class="space-y-6">
    <header class="pb-1">
      <h1 class="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Счета</h1>
      <p class="text-sm text-[var(--text-muted)] mt-2">История выставленных счетов</p>
    </header>

    <!-- Фильтр по статусу -->
    <div
      class="inline-flex rounded-xl border p-1"
      style="background: var(--glass-bg); border-color: var(--glass-border);"
      role="tablist"
    >
      <button
        v-for="f in filters"
        :key="f.value"
        type="button"
        role="tab"
        @click="filter = f.value as any"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
        :class="filter === f.value
          ? 'bg-primary text-white'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- =====================================================================
         LOADING — скелетон загрузки
         ===================================================================== -->
    <div v-if="pending" class="space-y-4">
      <UiCard v-for="i in 3" :key="i" class="animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-[var(--glass-bg)]"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-[var(--glass-bg)] rounded w-1/3"></div>
            <div class="h-3 bg-[var(--glass-bg)] rounded w-1/2"></div>
          </div>
        </div>
      </UiCard>
    </div>

    <!-- =====================================================================
         ERROR — состояние ошибки
         ===================================================================== -->
    <UiCard v-else-if="error">
      <UiErrorState
        title="Ошибка загрузки"
        description="Не удалось загрузить счета"
        @retry="refresh"
      />
    </UiCard>

    <!-- =====================================================================
         INVOICES LIST — список счетов
         ===================================================================== -->
    <div v-else class="space-y-4">
      <UiCard
        v-for="invoice in filteredInvoices"
        :key="invoice.id"
        hover
        class="cursor-pointer transition-all duration-200"
        @click="openInvoice(invoice.id)"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
              <Icon
                :name="invoice.status === 'paid' ? 'heroicons:check-circle' : 'heroicons:document-text'"
                class="w-6 h-6"
                :class="invoice.status === 'paid' ? 'text-accent' : 'text-primary'"
              />
            </div>
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs text-[var(--text-muted)]">{{ invoice.invoiceNumber }}</span>
                <UiBadge :class="getStatusBadgeClass(invoice.status)" size="sm">
                  {{ invoiceStatusLabels[invoice.status] }}
                </UiBadge>
              </div>
              <p class="font-medium text-[var(--text-primary)]">{{ formatInvoicePeriod(invoice) }}</p>
              <div class="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                <span v-if="invoice.issuedAt">Выставлен: {{ formatDateShort(invoice.issuedAt) }}</span>
                <span v-if="invoice.paidAt">Оплачен: {{ formatDateShort(invoice.paidAt) }}</span>
                <span v-else-if="invoice.dueDate">Срок: {{ formatDateShort(invoice.dueDate) }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-lg font-bold text-[var(--text-primary)]">
              {{ formatKopeks(invoice.amount) }}
              <span class="text-sm font-normal text-[var(--text-muted)]">₽</span>
            </span>
            <Icon name="heroicons:chevron-right" class="w-5 h-5 text-[var(--text-muted)] hidden sm:block" />
          </div>
        </div>
      </UiCard>

      <!-- Empty State -->
      <UiCard v-if="filteredInvoices.length === 0" padding="lg">
        <UiEmptyState
          icon="heroicons:document-text"
          title="Счетов не найдено"
          description="В этой категории счетов нет. Счета появятся после выставления."
        />
      </UiCard>
    </div>
  </div>
</template>
