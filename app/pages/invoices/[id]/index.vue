<script setup lang="ts">
/**
 * Страница детального просмотра счёта — состав услуг
 */
import type { Invoice } from '~/types/invoice'
import { invoiceStatusLabels, formatInvoicePeriod } from '~/types/invoice'
import { formatKopeks, formatDateShort } from '~/composables/useFormatters'
import { useInvoiceServices, type InvoiceDetails } from '~/composables/useInvoiceServices'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const invoiceId = route.params.id as string

const invoiceServices = useInvoiceServices()

const invoice = ref<Invoice | null>(null)
const invoiceLoading = ref(true)
const invoiceError = ref<string | null>(null)

const defaultDetails: InvoiceDetails = { addresses: [], totalAmount: 0, balance: 0, totalToPay: 0 }
const invoiceDetailsData = ref<InvoiceDetails>(defaultDetails)
const detailsLoading = ref(true)

const unpaidStatuses = ['pending', 'sent', 'viewed', 'expired']

const isUnpaid = computed(() =>
  invoice.value ? unpaidStatuses.includes(invoice.value.status) : false
)

const badgeClass = computed(() => {
  if (!invoice.value) return ''
  return invoice.value.status === 'paid'
    ? 'invoice-detail__badge--paid'
    : 'invoice-detail__badge--unpaid'
})

onMounted(async () => {
  try {
    const data = await $fetch<{ invoices: Invoice[] }>('/api/invoices')
    invoice.value = (data.invoices ?? []).find(inv => inv.id === invoiceId) ?? null
  } catch {
    invoiceError.value = 'Не удалось загрузить счёт'
  } finally {
    invoiceLoading.value = false
  }

  try {
    invoiceDetailsData.value = await invoiceServices.fetchInvoiceDetails(invoiceId)
  } catch {
    invoiceDetailsData.value = defaultDetails
  } finally {
    detailsLoading.value = false
  }
})
</script>

<template>
  <div class="invoice-detail space-y-8">
    <NuxtLink
      to="/invoices"
      class="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
    >
      <Icon name="heroicons:arrow-left" class="w-4 h-4" />
      Назад к счетам
    </NuxtLink>

    <!-- Loading -->
    <div v-if="invoiceLoading || detailsLoading" class="flex items-center justify-center py-12 text-[var(--text-muted)]">
      <span>Загрузка...</span>
    </div>

    <UiCard v-else-if="!invoice" padding="lg">
      <UiEmptyState
        icon="heroicons:document-text"
        title="Счёт не найден"
      />
    </UiCard>

    <template v-else>
      <!-- Заголовок -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start gap-4">
          <div class="invoice-detail__icon flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center">
            <Icon
              :name="invoice.status === 'paid' ? 'heroicons:check-circle' : 'heroicons:clock'"
              class="w-7 h-7"
              :class="invoice.status === 'paid' ? 'text-accent' : 'text-primary'"
            />
          </div>
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Состав услуг
            </h1>
            <p class="text-[var(--text-muted)] mt-1 text-sm sm:text-base">
              {{ invoice.invoiceNumber }} &bull; {{ formatInvoicePeriod(invoice) }}
            </p>
          </div>
        </div>
        <span class="invoice-detail__badge" :class="badgeClass">
          <Icon
            :name="invoice.status === 'paid' ? 'heroicons:check-circle' : 'heroicons:clock'"
            class="w-4 h-4"
          />
          {{ invoiceStatusLabels[invoice.status] }}
        </span>
      </div>

      <!-- Информация о счёте -->
      <div class="invoice-detail__meta">
        <div class="invoice-detail__meta-item">
          <span class="invoice-detail__meta-label">Дата выставления</span>
          <span class="invoice-detail__meta-value">{{ invoice.issuedAt ? formatDateShort(invoice.issuedAt) : '—' }}</span>
        </div>
        <div class="invoice-detail__meta-item">
          <span class="invoice-detail__meta-label">{{ invoice.paidAt ? 'Дата оплаты' : 'Срок оплаты' }}</span>
          <span class="invoice-detail__meta-value">
            {{ invoice.paidAt ? formatDateShort(invoice.paidAt) : (invoice.dueDate ? formatDateShort(invoice.dueDate) : '—') }}
          </span>
        </div>
        <div class="invoice-detail__meta-item">
          <span class="invoice-detail__meta-label">Сумма</span>
          <span class="invoice-detail__meta-value font-bold">{{ formatKopeks(invoice.amount) }} ₽</span>
        </div>
      </div>

      <!-- Адреса и услуги -->
      <div class="space-y-6">
        <div v-for="(address, idx) in invoiceDetailsData.addresses" :key="idx" class="space-y-4">
          <div class="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/5 border-l-4 border-primary">
            <div class="flex items-center gap-2">
              <Icon name="heroicons:map-pin" class="w-4 h-4 text-primary flex-shrink-0" />
              <p class="text-sm font-semibold text-[var(--text-primary)] leading-relaxed">{{ address.address }}</p>
            </div>
          </div>

          <div class="space-y-2 pl-4">
            <div
              v-for="(service, serviceIdx) in address.services"
              :key="serviceIdx"
              class="flex items-start justify-between gap-4 p-4 rounded-lg"
              style="background: var(--glass-bg);"
            >
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <div class="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                  <Icon name="heroicons:check" class="w-3 h-3 text-primary" />
                </div>
                <p class="text-sm text-[var(--text-primary)] leading-relaxed">{{ service.name }}</p>
              </div>
              <span class="flex-shrink-0 text-base font-bold text-[var(--text-primary)] whitespace-nowrap ml-4">
                {{ formatKopeks(service.price) }} ₽
              </span>
            </div>

            <div class="flex items-center justify-between gap-4 p-4 mt-3 rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 border-2" style="border-color: var(--glass-border);">
              <div class="flex items-center gap-2">
                <Icon name="heroicons:calculator" class="w-5 h-5 text-primary" />
                <span class="text-sm font-semibold text-[var(--text-primary)]">Итого по адресу:</span>
              </div>
              <span class="text-lg font-bold text-primary whitespace-nowrap">
                {{ formatKopeks(address.services.reduce((sum, s) => sum + s.price, 0)) }} ₽
              </span>
            </div>
          </div>

          <div v-if="idx < invoiceDetailsData.addresses.length - 1" class="my-6 border-t-2" style="border-color: var(--glass-border);" />
        </div>

        <!-- Итоговые суммы -->
        <div class="pt-6 mt-6 border-t-2" style="border-color: var(--glass-border);">
          <div class="space-y-3">
            <div class="flex justify-between items-center p-3 rounded-lg" style="background: var(--glass-bg);">
              <div class="flex items-center gap-2">
                <Icon name="heroicons:document-text" class="w-4 h-4 text-[var(--text-muted)]" />
                <span class="text-sm text-[var(--text-muted)]">Сумма услуг:</span>
              </div>
              <span class="text-base font-semibold text-[var(--text-primary)]">
                {{ formatKopeks(invoiceDetailsData.totalAmount) }} ₽
              </span>
            </div>
            <div class="flex justify-between items-center p-3 rounded-lg" style="background: var(--glass-bg);">
              <div class="flex items-center gap-2">
                <Icon name="heroicons:wallet" class="w-4 h-4 text-[var(--text-muted)]" />
                <span class="text-sm text-[var(--text-muted)]">Баланс счета:</span>
              </div>
              <span class="text-base font-semibold text-[var(--text-primary)]">
                {{ formatKopeks(invoiceDetailsData.balance) }} ₽
              </span>
            </div>
            <div class="flex justify-between items-center p-4 mt-2 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/5 border-2" style="border-color: var(--glass-border);">
              <div class="flex items-center gap-2">
                <Icon name="heroicons:banknotes" class="w-5 h-5 text-primary" />
                <span class="text-base font-bold text-[var(--text-primary)]">Итого к оплате:</span>
              </div>
              <span class="text-xl font-bold text-primary">
                {{ formatKopeks(invoiceDetailsData.totalToPay) }} ₽
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Кнопка «Счет на оплату» для неоплаченных -->
      <div v-if="isUnpaid" class="pt-2">
        <NuxtLink :to="`/invoices/${invoice.id}/payment`">
          <UiButton variant="primary" class="w-full sm:w-auto">
            Счет на оплату
          </UiButton>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.invoice-detail__icon {
  background: linear-gradient(135deg, rgba(247, 148, 29, 0.15) 0%, rgba(233, 30, 140, 0.08) 100%);
  border: 1px solid rgba(247, 148, 29, 0.2);
}

.invoice-detail__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.invoice-detail__badge--paid {
  background: rgba(0, 166, 81, 0.12);
  color: #00A651;
}

.invoice-detail__badge--unpaid {
  background: rgba(247, 148, 29, 0.12);
  color: #F7941D;
}

.invoice-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.invoice-detail__meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.invoice-detail__meta-label {
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.invoice-detail__meta-value {
  font-size: 0.9375rem;
  color: var(--text-primary);
}
</style>
