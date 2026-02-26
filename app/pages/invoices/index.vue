<script setup lang="ts">
/**
 * Страница счетов — история выставленных счетов:
 * - Фильтрация: все / к оплате / оплаченные
 * - Клик по счёту открывает детальную страницу
 *
 * Статусы счетов:
 * - pending, sent, viewed — неоплаченные
 * - paid — оплаченный
 * - expired — просроченный
 */
import type { Invoice, InvoiceStatus } from '~/types/invoice'
import { invoiceStatusLabels, invoiceStatusColors } from '~/types/invoice'
import { formatKopeks, formatDateShort } from '~/composables/useFormatters'

definePageMeta({
  middleware: 'auth'
})

// =============================================================================
// DATA — счета из API
// =============================================================================

const invoices = ref<Invoice[]>([])
const pending = ref(false)
const error = ref<string | null>(null)

async function loadInvoices() {
  pending.value = true
  error.value = null
  try {
    const data = await $fetch<{ invoices: Invoice[] }>('/api/invoices')
    invoices.value = data.invoices ?? []
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || 'Не удалось загрузить счета'
    invoices.value = []
  } finally {
    pending.value = false
  }
}

function refresh() {
  loadInvoices()
}

// =============================================================================
// STATE — фильтр
// =============================================================================

const filter = ref<'all' | 'unpaid' | 'paid'>('all')
const route = useRoute()

onMounted(async () => {
  await loadInvoices()

  const filterParam = route.query.filter as string
  if (filterParam && ['all', 'unpaid', 'paid'].includes(filterParam)) {
    filter.value = filterParam as 'all' | 'unpaid' | 'paid'
  }
})

// =============================================================================
// COMPUTED
// =============================================================================

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

const unpaidStatuses = ['pending', 'sent', 'viewed', 'expired']

const filters = [
  { value: 'all', label: 'Все' },
  { value: 'unpaid', label: 'К оплате' },
  { value: 'paid', label: 'Оплаченные' }
]

// =============================================================================
// METHODS
// =============================================================================

function getStatusBadgeClass(status: InvoiceStatus): string {
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
  <div class="invoices-page space-y-8">
    <!-- PAGE HEADER -->
    <div>
      <h1 class="text-2xl font-bold text-[var(--text-primary)]">Счета</h1>
      <p class="text-[var(--text-muted)] mt-1">История выставленных счетов и управление оплатами</p>
    </div>

    <!-- FILTERS -->
    <div class="flex flex-wrap gap-2 p-1 rounded-2xl" style="background: var(--glass-bg); border: 1px solid var(--glass-border); width: fit-content;">
      <button
        v-for="f in filters"
        :key="f.value"
        @click="filter = f.value as any"
        class="invoices-page__filter px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
        :class="filter === f.value
          ? 'bg-primary text-white shadow-lg shadow-primary/25'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-hover-bg)]'"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- LOADING -->
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

    <!-- ERROR -->
    <UiCard v-else-if="error">
      <UiErrorState
        title="Ошибка загрузки"
        description="Не удалось загрузить счета"
        @retry="refresh"
      />
    </UiCard>

    <!-- INVOICES TABLE (desktop) + CARDS (mobile) -->
    <div v-else>
      <UiCard v-if="filteredInvoices.length === 0" padding="lg">
        <UiEmptyState
          icon="heroicons:document-text"
          title="Счетов не найдено"
        />
      </UiCard>

      <template v-else>
        <!-- Desktop: таблица -->
        <div class="invoices-list animate-fade-in hidden md:block">
          <div class="invoices-list__header">
            <div class="invoices-col invoices-col--status">Статус</div>
            <div class="invoices-col invoices-col--date">Дата выставления</div>
            <div class="invoices-col invoices-col--date">Оплачен / Срок</div>
            <div class="invoices-col invoices-col--amount">Сумма</div>
            <div class="invoices-col invoices-col--actions">Действия</div>
          </div>

          <div class="invoices-list__body">
            <div
              v-for="invoice in filteredInvoices"
              :key="invoice.id"
              :id="`invoice-${invoice.id}`"
              class="invoices-row group"
              @click="navigateTo(`/invoices/${invoice.id}`)"
            >
              <div class="invoices-col invoices-col--status">
                <span
                  class="invoices-row__badge"
                  :class="invoice.status === 'paid' ? 'invoices-row__badge--paid' : 'invoices-row__badge--unpaid'"
                >
                  <Icon
                    :name="invoice.status === 'paid' ? 'heroicons:check-circle' : 'heroicons:clock'"
                    class="w-4 h-4"
                  />
                  {{ invoiceStatusLabels[invoice.status] }}
                </span>
              </div>
              <div class="invoices-col invoices-col--date">
                <span class="text-[var(--text-secondary)]">
                  {{ invoice.issuedAt ? formatDateShort(invoice.issuedAt) : '—' }}
                </span>
              </div>
              <div class="invoices-col invoices-col--date">
                <span class="text-[var(--text-secondary)]">
                  {{ invoice.paidAt ? formatDateShort(invoice.paidAt) : (invoice.dueDate ? formatDateShort(invoice.dueDate) : '—') }}
                </span>
              </div>
              <div class="invoices-col invoices-col--amount">
                <span class="invoices-row__amount">
                  {{ formatKopeks(invoice.amount) }}<span class="invoices-row__currency">₽</span>
                </span>
              </div>
              <div class="invoices-col invoices-col--actions">
                <NuxtLink
                  v-if="!unpaidStatuses.includes(invoice.status)"
                  :to="`/invoices/${invoice.id}`"
                >
                  <UiButton variant="ghost" size="sm">
                    Подробнее
                    <Icon name="heroicons:chevron-right" class="w-4 h-4" />
                  </UiButton>
                </NuxtLink>
                <NuxtLink
                  v-if="unpaidStatuses.includes(invoice.status)"
                  :to="`/invoices/${invoice.id}`"
                >
                  <UiButton variant="primary" size="sm">
                    Оплатить
                  </UiButton>
                </NuxtLink>
              </div>
            </div>
          </div>

          <div class="invoices-list__count">
            Всего: <strong class="text-[var(--text-primary)]">{{ filteredInvoices.length }}</strong> счетов
          </div>
        </div>

        <!-- Mobile: карточки -->
        <div class="md:hidden animate-fade-in space-y-3">
          <div
            v-for="invoice in filteredInvoices"
            :key="invoice.id"
            :id="`invoice-${invoice.id}`"
            class="invoices-mobile"
            @click="navigateTo(`/invoices/${invoice.id}`)"
          >
            <div class="invoices-mobile__top">
              <span
                class="invoices-row__badge"
                :class="invoice.status === 'paid' ? 'invoices-row__badge--paid' : 'invoices-row__badge--unpaid'"
              >
                <Icon
                  :name="invoice.status === 'paid' ? 'heroicons:check-circle' : 'heroicons:clock'"
                  class="w-4 h-4"
                />
                {{ invoiceStatusLabels[invoice.status] }}
              </span>
            </div>

            <div class="invoices-mobile__details">
              <div class="invoices-mobile__detail">
                <span class="invoices-mobile__label">Выставлен</span>
                <span class="invoices-mobile__value">{{ invoice.issuedAt ? formatDateShort(invoice.issuedAt) : '—' }}</span>
              </div>
              <div class="invoices-mobile__detail">
                <span class="invoices-mobile__label">{{ invoice.paidAt ? 'Оплачен' : 'Срок оплаты' }}</span>
                <span class="invoices-mobile__value">
                  {{ invoice.paidAt ? formatDateShort(invoice.paidAt) : (invoice.dueDate ? formatDateShort(invoice.dueDate) : '—') }}
                </span>
              </div>
              <div class="invoices-mobile__detail invoices-mobile__detail--amount">
                <span class="invoices-mobile__label">Сумма</span>
                <span class="invoices-row__amount">
                  {{ formatKopeks(invoice.amount) }}<span class="invoices-row__currency">₽</span>
                </span>
              </div>
            </div>

            <div class="invoices-mobile__actions" @click.stop>
              <NuxtLink
                v-if="!unpaidStatuses.includes(invoice.status)"
                :to="`/invoices/${invoice.id}`"
                class="flex-1"
              >
                <UiButton variant="ghost" size="sm" block>
                  Подробнее
                  <Icon name="heroicons:chevron-right" class="w-4 h-4" />
                </UiButton>
              </NuxtLink>
              <NuxtLink
                v-if="unpaidStatuses.includes(invoice.status)"
                :to="`/invoices/${invoice.id}`"
                class="flex-shrink-0"
              >
                <UiButton variant="primary" size="sm">
                  Оплатить
                </UiButton>
              </NuxtLink>
            </div>
          </div>

          <p class="text-xs text-[var(--text-muted)] text-center pt-2">
            Всего: <strong class="text-[var(--text-primary)]">{{ filteredInvoices.length }}</strong> счетов
          </p>
        </div>
      </template>
    </div>

  </div>
</template>

<style scoped>
.invoices-list {
  border-radius: 1.25rem;
  overflow: hidden;
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  box-shadow: 0 4px 24px var(--glass-shadow);
}

.invoices-col {
  display: flex;
  align-items: center;
  min-width: 0;
  font-size: 0.9rem;
}

.invoices-list__header,
.invoices-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  gap: 0 1.5rem;
}

.invoices-list__header {
  padding: 1.875rem 1.5rem;
  border-bottom: 2px solid var(--glass-border);
}

.invoices-list__header .invoices-col {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
  user-select: none;
}

.invoices-row {
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  border-bottom: 1px solid var(--glass-border);
  position: relative;
}

.invoices-row:last-child {
  border-bottom: none;
}

.invoices-row:hover {
  background: var(--glass-hover-bg);
  box-shadow: inset 0 0 0 1px var(--glass-hover-border);
  z-index: 1;
}

.invoices-col--amount {
  justify-content: flex-end;
  text-align: right;
}

.invoices-col--actions {
  justify-content: center;
  gap: 0.5rem;
  padding-left: 1.5rem;
}

.invoices-row__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.invoices-row__badge--paid {
  background: rgba(0, 166, 81, 0.12);
  color: #00A651;
}

.invoices-row__badge--unpaid {
  background: rgba(247, 148, 29, 0.12);
  color: #F7941D;
}

.invoices-row__amount {
  font-weight: 700;
  font-size: 0.9375rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.invoices-row__currency {
  margin-left: 0.2em;
  font-weight: 400;
  color: var(--text-muted);
}

.invoices-list__count {
  padding: 0.75rem 1.5rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  border-top: 1px solid var(--glass-border);
}

.invoices-mobile {
  border-radius: 1rem;
  overflow: hidden;
  background: var(--bg-surface);
  border: 1px solid var(--glass-border);
  box-shadow: 0 2px 12px var(--glass-shadow);
  cursor: pointer;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.invoices-mobile:active {
  box-shadow: 0 1px 4px var(--glass-shadow);
}

.invoices-mobile__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem 0;
}

.invoices-mobile__details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem 0.75rem;
  padding: 0.75rem 1rem;
}

.invoices-mobile__label {
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.invoices-mobile__value {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
}

.invoices-mobile__detail {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 3rem;
}

.invoices-mobile__detail--amount {
  align-items: flex-end;
}

.invoices-mobile__detail--amount .invoices-row__amount {
  font-size: 0.9375rem;
  font-weight: 700;
}

.invoices-mobile__actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem 1rem 1rem;
  border-top: 1px solid var(--glass-border);
  margin-top: 0.5rem;
}
</style>
