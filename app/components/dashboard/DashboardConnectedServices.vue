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
import type { InvoiceStatus } from '~/types/invoice'
import { invoiceStatusLabels, invoiceStatusColors, formatInvoicePeriod } from '~/types/invoice'
import { formatKopeks, formatDateShort } from '~/composables/useFormatters'

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const { fetchSubscriptions } = useServices()
const { fetchInvoices } = useInvoices()

// =============================================================================
// DATA — загрузка подписок и счетов
// =============================================================================

const { subscriptions } = await fetchSubscriptions()
const { invoices } = await fetchInvoices()

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

// Открыть счёт в новой вкладке (на invoice.doka.team)
function openInvoice(invoiceId: string): void {
  window.open(`https://invoice.doka.team/invoice/${invoiceId}`, '_blank')
}

// Получить CSS-класс для бейджа статуса счёта
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
  <section>
    <!-- Ссылка "Перейти к счетам" -->
    <div class="flex justify-end mb-4">
      <NuxtLink
        to="/invoices"
        class="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] hover:text-primary transition-colors"
      >
        <span>Перейти к счетам</span>
        <Icon name="heroicons:arrow-right" class="w-4 h-4" />
      </NuxtLink>
    </div>

    <!-- Список счетов -->
    <div class="space-y-4">
      <UiCard
        v-for="invoice in invoices"
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
      <UiCard v-if="invoices.length === 0" padding="lg">
        <UiEmptyState
          icon="heroicons:document-text"
          title="Счетов не найдено"
        />
      </UiCard>
    </div>
  </section>
</template>