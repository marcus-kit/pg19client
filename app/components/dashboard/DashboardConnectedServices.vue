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
 * Блок «Счета»: последние 3 счёта в табличной сводке, как на вкладке «Счета».
 */

import type { Service, Subscription, SubscriptionStatus } from '~/types/service'
import { subscriptionStatusLabels, subscriptionStatusColors } from '~/types/service'
import type { Invoice, InvoiceStatus } from '~/types/invoice'
import { invoiceStatusLabels } from '~/types/invoice'
import { formatKopeks, formatDateShort } from '~/composables/useFormatters'
import { useMockInvoices } from '~/composables/useMockInvoices'

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const { fetchSubscriptions } = useServices()
const { lastThreeInvoices } = useMockInvoices()

// =============================================================================
// DATA — загрузка подписок
// =============================================================================

const { subscriptions } = await fetchSubscriptions()

const unpaidStatuses = ['pending', 'sent', 'viewed', 'expired']

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

// Перейти на страницу конкретного счёта (состав услуг)
function openInvoice(invoiceId: string): void {
  navigateTo(`/invoices/${invoiceId}`)
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
      <!-- Табличная сводка: последние 3 счёта (как на вкладке «Счета») -->
      <div v-if="lastThreeInvoices.length > 0">
        <!-- Desktop: таблица -->
        <div class="dashboard-invoices hidden md:block">
          <div class="dashboard-invoices__header">
            <div class="dashboard-invoices__col dashboard-invoices__col--status">Статус</div>
            <div class="dashboard-invoices__col dashboard-invoices__col--date">Дата выставления</div>
            <div class="dashboard-invoices__col dashboard-invoices__col--date">Оплачен / Срок</div>
            <div class="dashboard-invoices__col dashboard-invoices__col--amount">Сумма</div>
            <div class="dashboard-invoices__col dashboard-invoices__col--actions">Действия</div>
          </div>
          <div
            v-for="invoice in lastThreeInvoices"
            :key="invoice.id"
            class="dashboard-invoices__row"
            @click="openInvoice(invoice.id)"
          >
            <div class="dashboard-invoices__col dashboard-invoices__col--status">
              <span
                class="dashboard-invoices__badge"
                :class="invoice.status === 'paid' ? 'dashboard-invoices__badge--paid' : 'dashboard-invoices__badge--unpaid'"
              >
                <Icon
                  :name="invoice.status === 'paid' ? 'heroicons:check-circle' : 'heroicons:clock'"
                  class="w-4 h-4"
                />
                {{ invoiceStatusLabels[invoice.status] }}
              </span>
            </div>
            <div class="dashboard-invoices__col dashboard-invoices__col--date">
              <span class="text-[var(--text-secondary)]">
                {{ invoice.issuedAt ? formatDateShort(invoice.issuedAt) : '—' }}
              </span>
            </div>
            <div class="dashboard-invoices__col dashboard-invoices__col--date">
              <span class="text-[var(--text-secondary)]">
                {{ invoice.paidAt ? formatDateShort(invoice.paidAt) : (invoice.dueDate ? formatDateShort(invoice.dueDate) : '—') }}
              </span>
            </div>
            <div class="dashboard-invoices__col dashboard-invoices__col--amount">
              <span class="dashboard-invoices__amount">
                {{ formatKopeks(invoice.amount) }}<span class="dashboard-invoices__currency">₽</span>
              </span>
            </div>
            <div class="dashboard-invoices__col dashboard-invoices__col--actions" @click.stop>
              <button
                v-if="!unpaidStatuses.includes(invoice.status)"
                type="button"
                class="dashboard-invoices__link"
                @click="openInvoice(invoice.id)"
              >
                <span>Подробнее</span>
                <Icon name="heroicons:chevron-right" class="w-4 h-4" />
              </button>
              <NuxtLink
                v-if="unpaidStatuses.includes(invoice.status)"
                :to="`/invoices/${invoice.id}`"
                class="dashboard-invoices__btn-link"
              >
                Оплатить
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Mobile: карточки -->
        <div class="md:hidden space-y-3">
          <div
            v-for="invoice in lastThreeInvoices"
            :key="invoice.id"
            class="dashboard-invoices-mobile"
            @click="openInvoice(invoice.id)"
          >
            <div class="dashboard-invoices-mobile__top">
              <span
                class="dashboard-invoices__badge"
                :class="invoice.status === 'paid' ? 'dashboard-invoices__badge--paid' : 'dashboard-invoices__badge--unpaid'"
              >
                <Icon
                  :name="invoice.status === 'paid' ? 'heroicons:check-circle' : 'heroicons:clock'"
                  class="w-4 h-4"
                />
                {{ invoiceStatusLabels[invoice.status] }}
              </span>
            </div>

            <div class="dashboard-invoices-mobile__details">
              <div class="dashboard-invoices-mobile__detail">
                <span class="dashboard-invoices-mobile__label">Выставлен</span>
                <span class="dashboard-invoices-mobile__value">{{ invoice.issuedAt ? formatDateShort(invoice.issuedAt) : '—' }}</span>
              </div>
              <div class="dashboard-invoices-mobile__detail">
                <span class="dashboard-invoices-mobile__label">{{ invoice.paidAt ? 'Оплачен' : 'Срок оплаты' }}</span>
                <span class="dashboard-invoices-mobile__value">
                  {{ invoice.paidAt ? formatDateShort(invoice.paidAt) : (invoice.dueDate ? formatDateShort(invoice.dueDate) : '—') }}
                </span>
              </div>
              <div class="dashboard-invoices-mobile__detail dashboard-invoices-mobile__detail--amount">
                <span class="dashboard-invoices-mobile__label">Сумма</span>
                <span class="dashboard-invoices__amount">
                  {{ formatKopeks(invoice.amount) }}<span class="dashboard-invoices__currency">₽</span>
                </span>
              </div>
            </div>

            <div class="dashboard-invoices-mobile__actions" @click.stop>
              <button
                v-if="!unpaidStatuses.includes(invoice.status)"
                type="button"
                class="dashboard-invoices__link flex-1 justify-center"
                @click="openInvoice(invoice.id)"
              >
                <span>Подробнее</span>
                <Icon name="heroicons:chevron-right" class="w-4 h-4" />
              </button>
              <NuxtLink
                v-if="unpaidStatuses.includes(invoice.status)"
                :to="`/invoices/${invoice.id}`"
                class="flex-shrink-0"
              >
                <UiButton
                  variant="primary"
                  size="sm"
                  class="shadow-md shadow-primary/20"
                >
                  Оплатить
                </UiButton>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="py-8">
        <UiEmptyState
          icon="heroicons:document-text"
          title="Счетов не найдено"
        />
      </div>
    </UiCard>
  </section>
</template>

<style scoped>
.dashboard-invoices {
  border-radius: 1rem;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  background: var(--bg-surface);
}

.dashboard-invoices__header,
.dashboard-invoices__row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  gap: 0 1rem;
}

.dashboard-invoices__header {
  padding: 0.75rem 1rem;
  border-bottom: 2px solid var(--glass-border);
}

.dashboard-invoices__header .dashboard-invoices__col {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.dashboard-invoices__col {
  display: flex;
  align-items: center;
  min-width: 0;
  font-size: 0.875rem;
}

.dashboard-invoices__row {
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid var(--glass-border);
  transition: background-color 0.15s ease;
}

.dashboard-invoices__row:last-child {
  border-bottom: none;
}

.dashboard-invoices__row:hover {
  background: var(--glass-hover-bg);
}

.dashboard-invoices__col--amount {
  justify-content: flex-end;
}

.dashboard-invoices__col--actions {
  justify-content: center;
  padding-left: 1rem;
  gap: 0.5rem;
}

.dashboard-invoices__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
}

.dashboard-invoices__badge--paid {
  background: rgba(0, 166, 81, 0.12);
  color: #00A651;
}

.dashboard-invoices__badge--unpaid {
  background: rgba(247, 148, 29, 0.12);
  color: #F7941D;
}

.dashboard-invoices__amount {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.dashboard-invoices__currency {
  margin-left: 0.2em;
  font-weight: 400;
  color: var(--text-muted);
}

.dashboard-invoices__link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.dashboard-invoices__link:hover {
  color: var(--text-primary);
  background: var(--glass-bg);
}

.dashboard-invoices__btn-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  background: #F7941D;
  box-shadow: 0 2px 8px rgba(247, 148, 29, 0.25);
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
  text-decoration: none;
}

.dashboard-invoices__btn-link:hover {
  background: #D67A0A;
  box-shadow: 0 4px 12px rgba(247, 148, 29, 0.35);
}

/* =========================================================================
   MOBILE CARDS — мобильная версия счетов
   ========================================================================= */
.dashboard-invoices-mobile {
  border-radius: 1rem;
  overflow: hidden;
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  box-shadow: 0 2px 12px var(--glass-shadow);
  cursor: pointer;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.dashboard-invoices-mobile:active {
  box-shadow: 0 1px 4px var(--glass-shadow);
}

.dashboard-invoices-mobile__top {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 1rem 1rem 0.75rem 1rem;
}

.dashboard-invoices-mobile__details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem 0.75rem;
  padding: 0.75rem 1rem;
}

.dashboard-invoices-mobile__label {
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.dashboard-invoices-mobile__value {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
}

.dashboard-invoices-mobile__detail {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 3rem;
}

.dashboard-invoices-mobile__detail--amount {
  align-items: flex-end;
}

.dashboard-invoices-mobile__detail--amount .dashboard-invoices__amount {
  font-size: 0.9375rem;
  font-weight: 700;
}

.dashboard-invoices-mobile__actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem 1rem 1rem;
  border-top: 1px solid var(--glass-border);
  margin-top: 0.5rem;
}
</style>