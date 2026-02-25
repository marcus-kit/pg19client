<script setup lang="ts">
/**
 * DashboardBalanceCard — две карточки: статус услуги и подключение
 *
 * Особенности:
 * - Левая карточка: индикатор статуса (активен/заблокирован), дата оплаты, кнопка оплаты
 * - Правая карточка: статус подключения, услуга активна, адрес
 */

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const accountStore = useAccountStore()
const { fetchUnpaidInvoices } = useInvoices()
const { fetchSubscriptions } = useServices()

// =============================================================================
// DATA — загрузка неоплаченных счетов и подписок
// =============================================================================

const { invoices: unpaidInvoices } = await fetchUnpaidInvoices()
const { subscriptions } = await fetchSubscriptions()

// Загружаем актуальный аккаунт; при отсутствии договора очищаем store
const { data: accountData } = await useFetch<{ account: import('~/types').Account | null }>('/api/account/current', { key: 'account-current' })
if (accountData.value?.account) {
  accountStore.setAccount(accountData.value.account)
} else {
  accountStore.clear()
}

// =============================================================================
// STATE — реактивное состояние
// =============================================================================

const showAllPaidModal = ref(false)
const showAllAddresses = ref(false)

// =============================================================================
// COMPUTED
// =============================================================================

// Следующая дата оплаты по дню договора (payDay); при отсутствии договора — null
const nextPaymentDate = computed(() => {
  if (!accountStore.account) return null
  const payDay = accountStore.account.payDay ?? 20
  const now = new Date()
  const lastDayCur = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayCur = Math.min(payDay, lastDayCur)
  let next = new Date(now.getFullYear(), now.getMonth(), dayCur)
  if (next.getTime() <= now.getTime()) {
    const lastDayNext = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate()
    next = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(payDay, lastDayNext))
  }
  return next.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long'
  })
})

// Конфигурация статуса: нет договора / заблокирован / активен
const statusConfig = computed(() => {
  if (!accountStore.account) {
    return {
      text: 'Нет активного договора',
      color: 'bg-[var(--text-muted)]',
      icon: 'heroicons:minus-circle',
      iconColor: 'text-[var(--text-muted)]'
    }
  }
  if (accountStore.isBlocked) {
    return {
      text: 'Заблокирован',
      color: 'bg-red-500',
      icon: 'heroicons:x-circle',
      iconColor: 'text-red-400'
    }
  }
  return {
    text: 'Активен',
    color: 'bg-accent',
    icon: 'heroicons:check-circle',
    iconColor: 'text-accent'
  }
})

// Статус подключения: тариф из аккаунта или название первой услуги из подписок
const connectionStatus = computed(() => {
  if (accountStore.account?.tariff) return accountStore.account.tariff
  const subs = subscriptions.value
  const primary = subs.find((s: { isPrimary?: boolean }) => s.isPrimary)
  if (primary?.service?.name) return primary.service.name
  if (subs[0]?.service?.name) return subs[0].service.name
  return subs.length > 0 ? 'Подключен' : 'Не подключен'
})

// Адреса подключения из подписок (object_address), без дубликатов
const connectionAddresses = computed(() => {
  const subs = subscriptions.value
  const addresses: string[] = []
  const seen = new Set<string>()
  for (const s of subs) {
    const addr = (s as { address?: string | null }).address
    if (addr && addr.trim() && !seen.has(addr.trim())) {
      seen.add(addr.trim())
      addresses.push(addr.trim())
    }
  }
  if (addresses.length === 0 && accountStore.account?.address) {
    return [accountStore.account.address]
  }
  return addresses
})

const showExpandButton = computed(() => connectionAddresses.value.length > 3)

const visibleAddresses = computed(() => {
  const list = connectionAddresses.value
  if (showAllAddresses.value || list.length <= 3) return list
  return list.slice(0, 3)
})

// =============================================================================
// METHODS
// =============================================================================

// Обработчик клика на кнопку оплаты
function handlePayClick(): void {
  if (unpaidInvoices.value.length > 0) {
    const first = unpaidInvoices.value[0]
    if (first) {
      window.open(`https://invoice.doka.team/invoice/${first.id}`, '_blank')
    }
  } else {
    showAllPaidModal.value = true
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Карточка: Статус услуги -->
    <UiCard hover>
    <div class="flex items-start justify-between mb-4">
      <div>
        <p class="text-sm text-[var(--text-muted)] mb-1">Статус договора</p>
        <div class="flex items-center gap-3 mt-2">
          <span class="relative flex h-3 w-3">
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              :class="statusConfig.color"
            ></span>
            <span
              class="relative inline-flex rounded-full h-3 w-3"
              :class="statusConfig.color"
            ></span>
          </span>
          <span class="text-xl font-semibold text-[var(--text-primary)]">
            {{ statusConfig.text }}
          </span>
        </div>
      </div>
      <div class="icon-container">
        <Icon :name="statusConfig.icon" class="w-6 h-6" :class="statusConfig.iconColor" />
      </div>
    </div>

    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-[var(--text-muted)]">
        <Icon name="heroicons:calendar" class="w-4 h-4" />
        <span class="text-sm">
          Следующая оплата
          <span class="block md:inline text-[var(--text-primary)] font-medium md:ml-1">{{ nextPaymentDate ?? '—' }}</span>
        </span>
      </div>
      <UiButton v-if="accountStore.account" size="sm" variant="secondary" @click="handlePayClick">
        Оплатить сейчас
      </UiButton>
    </div>
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
        <!-- Список адресов подключения -->
        <p v-if="connectionAddresses.length === 0" class="text-sm text-[var(--text-muted)]">
          Нет данных об адресах подключения
        </p>
        <div v-for="(address, index) in visibleAddresses" :key="index" class="space-y-2">
          <div class="flex items-start gap-3">
            <Icon name="heroicons:map-pin" class="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
            <span class="text-sm text-[var(--text-primary)] flex-1">{{ address }}</span>
          </div>
          <div class="flex items-center gap-3 pl-7">
            <span class="relative flex h-3 w-3">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-accent"
              ></span>
              <span
                class="relative inline-flex rounded-full h-3 w-3 bg-accent"
              ></span>
            </span>
            <span class="text-sm text-[var(--text-secondary)]">
              Услуга активна
            </span>
          </div>
          <!-- Разделитель между адресами (кроме последнего видимого) -->
          <div v-if="index < visibleAddresses.length - 1" class="pt-2 border-t" style="border-color: var(--glass-border);"></div>
        </div>

        <!-- Кнопка разворачивания/сворачивания -->
        <button
          v-if="showExpandButton"
          @click="showAllAddresses = !showAllAddresses"
          class="w-full flex items-center justify-center gap-2 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <span>{{ showAllAddresses ? 'Свернуть' : `Показать ещё ${connectionAddresses.length - 3}` }}</span>
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
