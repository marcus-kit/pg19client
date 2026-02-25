<script setup lang="ts">
/**
 * DashboardBalanceCard — две карточки: статус услуги и подключение
 *
 * Особенности:
 * - Левая карточка: индикатор статуса (активен/заблокирован), дата оплаты, кнопка оплаты
 * - Правая карточка: статус подключения, адреса с раскрытием тарифов возле каждого
 */

import { mockInvoiceDetails } from '~/composables/useInvoiceServices'

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const accountStore = useAccountStore()
const { fetchUnpaidInvoices } = useInvoices()

// =============================================================================
// DATA — загрузка неоплаченных счетов
// =============================================================================

const { invoices: unpaidInvoices } = await fetchUnpaidInvoices()

// =============================================================================
// STATE — реактивное состояние
// =============================================================================

const showAllPaidModal = ref(false)
const showAllAddresses = ref(false) // Показывать все адреса или только первые 3
// Индексы адресов, у которых раскрыт блок тарифов (открытие возле каждого адреса)
const expandedAddressIndices = ref<Set<number>>(new Set())

// Адреса с подключёнными тарифами (услугами) — те же данные, что в счёте
const addressesWithTariffs = mockInvoiceDetails.addresses

// =============================================================================
// COMPUTED
// =============================================================================

const { formatKopeks, formatContractNumber } = useFormatters()

// Следующая дата оплаты (последний день текущего месяца) с годом — для строки "След. платеж:"
const nextPaymentDateFull = computed(() => {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return lastDay.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})

// Сумма к оплате по неоплаченным счетам (в копейках); при отсутствии данных — 3095 ₽
const amountToPayKopeks = computed(() => {
  const sum = unpaidInvoices.value.reduce((s, inv) => s + inv.amount, 0)
  return sum > 0 ? sum : 309500 // 3095 ₽ в копейках
})

// Конфигурация статуса — пилюля с точкой и текстом (крупнее, контрастнее)
const statusConfig = computed(() => {
  if (accountStore.isBlocked) {
    return {
      text: 'Заблокирован',
      pillClass: 'bg-red-500/25',
      dotClass: 'bg-red-400',
      textClass: 'text-red-400',
      borderClass: 'border-red-500/50'
    }
  }
  return {
    text: 'Активен',
    pillClass: 'bg-accent/25',
    dotClass: 'bg-accent',
    textClass: 'text-accent',
    borderClass: 'border-accent/50'
  }
})

// Статус подключения (если нет тарифа - "Не подключен")
const connectionStatus = computed(() => {
  return accountStore.account?.tariff || 'Не подключен'
})

// Показывать кнопку «Показать ещё», если адресов больше 2 (третий и четвёртый скрыты)
const showExpandButton = computed(() => addressesWithTariffs.length > 2)

// Видимые адреса: по умолчанию два, остальные по «Показать ещё»
const visibleAddressItems = computed(() => {
  if (showAllAddresses.value || addressesWithTariffs.length <= 2) {
    return addressesWithTariffs
  }
  return addressesWithTariffs.slice(0, 2)
})

function toggleAddressTariffs(index: number): void {
  const next = new Set(expandedAddressIndices.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  expandedAddressIndices.value = next
}

// =============================================================================
// METHODS
// =============================================================================

// Обработчик клика на кнопку оплаты
function handlePayClick(): void {
  // Всегда перенаправляем на страницу счетов с фильтром "к оплате"
  navigateTo('/invoices?filter=unpaid')
}
</script>

<template>
  <div class="space-y-4">
    <!-- Карточка: ИНТЕРНЕТ ПЖ19 — по референсу: шапка (услуга + статус-пилюля), строки Договор / След. платеж / К оплате -->
    <UiCard hover>
      <!-- Верхняя строка: подпись «Статус договора» слева, статус-пилюля справа (крупнее для наглядности) -->
      <div class="flex items-center justify-between gap-4 mb-5">
        <p class="text-sm font-medium text-[var(--text-secondary)] mb-0">
          Статус договора
        </p>
        <span
          class="flex-shrink-0 inline-flex items-center gap-2.5 rounded-full py-2 px-4 text-base font-semibold border"
          :class="[statusConfig.pillClass, statusConfig.textClass, statusConfig.borderClass]"
        >
          <span class="h-2.5 w-2.5 rounded-full flex-shrink-0" :class="statusConfig.dotClass" aria-hidden="true" />
          {{ statusConfig.text }}
        </span>
      </div>

      <!-- Строки: подпись слева, значение справа -->
      <div class="space-y-3 mb-5">
        <div class="flex items-center justify-between gap-4">
          <span class="text-sm text-[var(--text-muted)]">Договор:</span>
          <span class="text-sm text-[var(--text-primary)]">№ {{ formatContractNumber(accountStore.account?.contractNumber) }}</span>
        </div>
        <div class="flex items-center justify-between gap-4">
          <span class="text-sm text-[var(--text-muted)]">След. платеж:</span>
          <span class="text-sm text-[var(--text-primary)]">{{ nextPaymentDateFull }}</span>
        </div>
        <div class="flex items-center justify-between gap-4">
          <span class="text-sm text-[var(--text-muted)]">К оплате:</span>
          <span class="text-sm text-[var(--text-primary)]">
            <span class="font-bold">{{ formatKopeks(amountToPayKopeks) }}</span>
            <span class="font-normal"> ₽</span>
          </span>
        </div>
      </div>

      <UiButton size="sm" variant="primary" class="w-full sm:w-auto" @click="handlePayClick">
        Оплатить сейчас
      </UiButton>
    </UiCard>

    <!-- Карточка: Подключение -->
    <UiCard hover>
      <div class="flex items-start justify-between mb-4">
        <div>
          <p class="text-sm text-[var(--text-muted)] mb-1">Подключение</p>
          <p class="text-xl font-semibold text-[var(--text-primary)] mt-2">
            {{ connectionStatus }}
          </p>
        </div>
        <div class="icon-container">
          <Icon name="heroicons:wifi" class="w-6 h-6 text-primary" />
        </div>
      </div>

      <div class="space-y-4">
        <!-- Список адресов с раскрытием тарифов возле каждого -->
        <div v-for="(item, index) in visibleAddressItems" :key="index" class="space-y-2">
          <div class="flex items-start gap-2">
            <Icon name="heroicons:map-pin" class="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
            <span class="text-sm text-[var(--text-primary)] flex-1 min-w-0">{{ item.address }}</span>
            <button
              type="button"
              :aria-expanded="expandedAddressIndices.has(index)"
              class="flex-shrink-0 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
              @click="toggleAddressTariffs(index)"
            >
              <Icon
                name="heroicons:chevron-down"
                class="w-4 h-4 transition-transform duration-200"
                :class="{ 'rotate-180': expandedAddressIndices.has(index) }"
              />
            </button>
          </div>
          <div class="flex items-center gap-2 pl-6">
            <span class="h-1.5 w-1.5 rounded-full bg-accent/70 flex-shrink-0 mt-1.5" aria-hidden="true" />
            <span class="text-sm text-[var(--text-secondary)]">Услуга активна</span>
          </div>
          <!-- Раскрывающийся блок тарифов по этому адресу -->
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-1 max-h-0"
            enter-to-class="opacity-100 translate-y-0 max-h-[800px]"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0 max-h-[800px]"
            leave-to-class="opacity-0 -translate-y-1 max-h-0"
          >
            <div v-show="expandedAddressIndices.has(index)" class="overflow-hidden pl-6">
              <div class="rounded-lg p-3 mt-1" style="background: var(--glass-bg);">
                <ul class="space-y-1.5">
                  <li
                    v-for="(service, svcIndex) in item.services"
                    :key="svcIndex"
                    class="flex items-center justify-between gap-2 text-sm"
                  >
                    <span class="text-[var(--text-secondary)] line-clamp-2">{{ service.name }}</span>
                    <span class="text-[var(--text-primary)] font-medium whitespace-nowrap flex-shrink-0">
                      {{ formatKopeks(service.price) }} ₽
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </Transition>
          <div v-if="index < visibleAddressItems.length - 1" class="pt-2 border-t" style="border-color: var(--glass-border);" />
        </div>

        <!-- Кнопка «Показать ещё» адресов -->
        <button
          v-if="showExpandButton"
          @click="showAllAddresses = !showAllAddresses"
          class="w-full flex items-center justify-center gap-2 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <span>{{ showAllAddresses ? 'Свернуть' : `Показать ещё ${addressesWithTariffs.length - 2}` }}</span>
          <Icon
            name="heroicons:chevron-down"
            class="w-4 h-4 transition-transform duration-200"
            :class="{ 'rotate-180': showAllAddresses }"
          />
        </button>
      </div>
    </UiCard>
  </div>

  <!-- Модальное окно "Все счета оплачены" -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="showAllPaidModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showAllPaidModal = false"
      >
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-sm rounded-2xl p-6 text-center" style="background: var(--card-bg); border: 1px solid var(--glass-border);">
          <div class="mx-auto mb-4 w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
            <Icon name="heroicons:check-circle" class="w-10 h-10 text-accent" />
          </div>
          <h3 class="text-xl font-semibold text-[var(--text-primary)] mb-2">Все счета оплачены!</h3>
          <p class="text-[var(--text-muted)] mb-6">У вас нет неоплаченных счетов</p>
          <UiButton @click="showAllPaidModal = false" class="w-full">
            Отлично
          </UiButton>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
