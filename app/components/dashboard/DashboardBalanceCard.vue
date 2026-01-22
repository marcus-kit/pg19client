<script setup lang="ts">
const accountStore = useAccountStore()

// Получаем неоплаченные счета
const { fetchUnpaidInvoices } = useInvoices()
const { invoices: unpaidInvoices } = await fetchUnpaidInvoices()

// Попап "Все счета оплачены"
const showAllPaidModal = ref(false)

// Обработчик клика на кнопку оплаты
const handlePayClick = () => {
  if (unpaidInvoices.value.length > 0) {
    // Открываем первый неоплаченный счёт
    window.open(`https://invoice.doka.team/invoice/${unpaidInvoices.value[0].id}`, '_blank')
  } else {
    // Показываем попап
    showAllPaidModal.value = true
  }
}

// Расчёт следующей даты оплаты (конец текущего месяца)
const nextPaymentDate = computed(() => {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return lastDay.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long'
  })
})

// Статус аккаунта
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
</script>

<template>
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
          Следующая оплата: <span class="text-[var(--text-primary)] font-medium">{{ nextPaymentDate }}</span>
        </span>
      </div>
      <UiButton size="sm" variant="secondary" @click="handlePayClick">
        Оплатить сейчас
      </UiButton>
    </div>
  </UiCard>

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
