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

// =============================================================================
// DATA — загрузка неоплаченных счетов
// =============================================================================

const { invoices: unpaidInvoices } = await fetchUnpaidInvoices()

// =============================================================================
// STATE — реактивное состояние
// =============================================================================

const showAllPaidModal = ref(false)

// =============================================================================
// COMPUTED
// =============================================================================

// Расчёт следующей даты оплаты (конец текущего месяца)
const nextPaymentDate = computed(() => {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return lastDay.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long'
  })
})

// Конфигурация статуса аккаунта
const statusConfig = computed(() => {
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

// Статус подключения (если нет тарифа - "Не подключен")
const connectionStatus = computed(() => {
  return accountStore.account?.tariff || 'Не подключен'
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
  <div class="grid md:grid-cols-2 gap-4">
    <!-- Левая карточка: Статус услуги -->
  <UiCard hover>
    <div class="flex items-start justify-between mb-4">
      <div>
        <p class="text-sm text-[var(--text-muted)] mb-1">Статус услуги</p>
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
            <span class="block md:inline text-[var(--text-primary)] font-medium md:ml-1">{{ nextPaymentDate }}</span>
        </span>
      </div>
      <UiButton size="sm" variant="secondary" @click="handlePayClick">
        Оплатить сейчас
      </UiButton>
    </div>
  </UiCard>

    <!-- Правая карточка: Подключение -->
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

      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <span class="relative flex h-3 w-3">
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              :class="accountStore.isBlocked ? 'bg-red-500' : 'bg-accent'"
            ></span>
            <span
              class="relative inline-flex rounded-full h-3 w-3"
              :class="accountStore.isBlocked ? 'bg-red-500' : 'bg-accent'"
            ></span>
          </span>
          <span class="text-sm text-[var(--text-secondary)]">
            {{ accountStore.isBlocked ? 'Услуга приостановлена' : 'Услуга активна' }}
          </span>
        </div>

        <div class="flex items-center gap-3 text-sm text-[var(--text-muted)]">
          <Icon name="heroicons:map-pin" class="w-4 h-4" />
          <span class="line-clamp-1">{{ accountStore.account?.address || '—' }}</span>
        </div>
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
