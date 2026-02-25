<script setup lang="ts">
/**
 * DashboardConnectedServices — список подключенных услуг пользователя
 *
 * Отображает карточки с информацией о каждой подключенной услуге:
 * - Название и описание
 * - Статус (активна/приостановлена/отменена)
 * - Цена
 * - Кнопка "Подробнее"
 *
 * Если нет подключенных услуг, показывает счета и ссылку "Перейти к счетам"
 */

import type { Service, Subscription, SubscriptionStatus } from '~/types/service'
import { subscriptionStatusLabels, subscriptionStatusColors } from '~/types/service'
import type { Invoice, InvoiceStatus } from '~/types/invoice'
import { invoiceStatusLabels, invoiceStatusColors, formatInvoicePeriod } from '~/types/invoice'
import { formatKopeks, formatDateShort } from '~/composables/useFormatters'

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const { fetchSubscriptions } = useServices()

// =============================================================================
// DATA — загрузка подписок
// =============================================================================

const { subscriptions } = await fetchSubscriptions()

// =============================================================================
// DATA — счета из API
// =============================================================================

const invoices = ref<Invoice[]>([])
const invoicesPending = ref(false)

onMounted(async () => {
  invoicesPending.value = true
  try {
    const data = await $fetch<{ invoices: Invoice[] }>('/api/invoices')
    invoices.value = data.invoices ?? []
  } catch {
    invoices.value = []
  } finally {
    invoicesPending.value = false
  }
})

// Сортированные счета: сначала ожидающие оплаты, затем оплаченные (снизу вверх)
const sortedInvoices = computed(() => {
  return [...invoices.value].sort((a, b) => {
    // Сначала неоплаченные (pending, sent, viewed, expired)
    const unpaidStatuses = ['pending', 'sent', 'viewed', 'expired']
    const aIsUnpaid = unpaidStatuses.includes(a.status)
    const bIsUnpaid = unpaidStatuses.includes(b.status)
    
    // Если один неоплаченный, а другой оплаченный - неоплаченный идет первым
    if (aIsUnpaid && !bIsUnpaid) return -1
    if (!aIsUnpaid && bIsUnpaid) return 1
    
    // Если оба в одной группе (оба неоплаченные или оба оплаченные)
    // Сортируем по дате начала периода
    const dateA = a.periodStart ? new Date(a.periodStart).getTime() : 0
    const dateB = b.periodStart ? new Date(b.periodStart).getTime() : 0
    
    // Для неоплаченных - по возрастанию (будущий месяц первым)
    // Для оплаченных - по убыванию (текущий, потом прошлый - снизу вверх)
    if (aIsUnpaid && bIsUnpaid) {
      return dateA - dateB // по возрастанию
    } else {
      return dateB - dateA // по убыванию (обратный порядок)
    }
  })
})

// =============================================================================
// METHODS
// =============================================================================

// Получить цену подписки (индивидуальная или стандартная)
function getSubscriptionPrice(sub: Subscription): number {
  return sub.customPrice ?? sub.service?.priceMonthly ?? 0
}

// Получить CSS-класс для бейджа статуса
function getStatusColor(status: SubscriptionStatus): string {
  const colorMap: Record<string, string> = {
    green: 'bg-accent/20 text-accent',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    gray: 'bg-gray-600/20 text-gray-400'
  }
  const color = subscriptionStatusColors[status] as string
  return (color in colorMap ? colorMap[color] : colorMap.gray) as string
}

// Получить иконку услуги
function getServiceIcon(service: Service | undefined): string {
  return service?.icon || 'heroicons:cube'
}

// Перейти на страницу счетов с открытием конкретного счета
function openInvoice(invoiceId: string): void {
  navigateTo(`/invoices?id=${invoiceId}`)
}

// Получить CSS-класс для бейджа статуса счёта
function getStatusBadgeClass(status: InvoiceStatus): string {
  // Неоплаченные счета - красный фон
  const unpaidStatuses = ['pending', 'sent', 'viewed', 'expired']
  if (unpaidStatuses.includes(status)) {
    return 'bg-red-500/20 text-red-400'
  }
  
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
  <section>
    <!-- Контейнер со счетами -->
    <UiCard padding="lg" class="space-y-4">
      <!-- Заголовок и ссылка "Перейти к счетам" -->
      <div class="flex items-center justify-between pb-4 border-b" style="border-color: var(--glass-border);">
        <h2 class="text-2xl font-bold text-[var(--text-primary)]">Счета</h2>
        <NuxtLink
          to="/invoices"
          class="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] hover:text-primary transition-colors"
        >
          <span>Перейти к счетам</span>
          <Icon name="heroicons:arrow-right" class="w-4 h-4" />
        </NuxtLink>
      </div>
      <div class="space-y-4">
        <UiCard
          v-for="invoice in sortedInvoices"
          :key="invoice.id"
          hover
          class="cursor-pointer"
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
        <div v-if="sortedInvoices.length === 0" class="py-8">
          <UiEmptyState
            icon="heroicons:document-text"
            title="Счетов не найдено"
          />
        </div>
      </div>
    </UiCard>
  </section>
</template>