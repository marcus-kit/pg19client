<script setup lang="ts">
/**
 * Страница профиля — 2 вкладки:
 * 1. Персональные данные — ФИО, контакты, Telegram
 * 2. Договор — информация о договоре и адресе
 */
definePageMeta({
  middleware: 'auth'
})

// =============================================================================
// STORES
// =============================================================================

const userStore = useUserStore()
const accountStore = useAccountStore()

// =============================================================================
// STATE
// =============================================================================

// Активная вкладка
const activeTab = ref<'personal' | 'contract'>('personal')

// Конфигурация вкладок
const tabs = [
  { id: 'personal' as const, label: 'Персональные данные', icon: 'heroicons:identification' },
  { id: 'contract' as const, label: 'Договор', icon: 'heroicons:document-text' }
]

const contractStatus = computed(() => (accountStore.isBlocked ? 'Приостановлен' : 'Активен'))
const contractStatusVariant = computed(() => (accountStore.isBlocked ? 'danger' : 'success') as const)
</script>

<template>
  <div class="space-y-6">
    <header class="pb-1">
      <h1 class="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Профиль</h1>
      <p class="text-sm text-[var(--text-muted)] mt-2">Управление личными данными</p>
    </header>

    <!-- =====================================================================
         PROFILE SUMMARY — быстрый обзор, чтобы было понятнее "кто я"
         ===================================================================== -->
    <UiCard class="p-0 overflow-hidden">
      <div class="p-5">
        <div class="flex flex-col md:flex-row md:items-center gap-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
              <img v-if="userStore.user?.avatar" :src="userStore.user.avatar" alt="Аватар" class="w-full h-full object-cover" />
              <Icon v-else name="heroicons:user" class="w-7 h-7 text-[var(--text-muted)]" />
            </div>
            <div class="min-w-0">
              <p class="text-xs text-[var(--text-muted)]">Профиль</p>
              <p class="text-lg font-semibold text-[var(--text-primary)] truncate">
                {{ userStore.fullName || 'Пользователь' }}
              </p>
              <div class="flex flex-wrap items-center gap-2 mt-1 text-sm text-[var(--text-muted)]">
                <span v-if="accountStore.account?.contractNumber">Договор {{ accountStore.account.contractNumber }}</span>
                <span v-if="accountStore.account?.contractNumber" class="opacity-60">·</span>
                <UiBadge v-if="accountStore.account" :variant="contractStatusVariant" size="sm">{{ contractStatus }}</UiBadge>
                <UiBadge v-if="accountStore.account?.tariff" variant="neutral" size="sm">{{ accountStore.account.tariff }}</UiBadge>
              </div>
            </div>
          </div>

          <div class="md:ml-auto grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto">
            <div class="flex items-start gap-2 p-3 rounded-xl" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
              <Icon name="heroicons:phone" class="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
              <div class="min-w-0">
                <p class="text-xs text-[var(--text-muted)]">Телефон</p>
                <p class="text-sm text-[var(--text-primary)] truncate">{{ userStore.user?.phone || 'Не указан' }}</p>
              </div>
            </div>
            <div class="flex items-start gap-2 p-3 rounded-xl" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
              <Icon name="heroicons:envelope" class="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
              <div class="min-w-0">
                <p class="text-xs text-[var(--text-muted)]">Email</p>
                <p class="text-sm text-[var(--text-primary)] truncate">{{ userStore.user?.email || 'Не указан' }}</p>
              </div>
            </div>
            <div class="sm:col-span-2 flex items-start gap-2 p-3 rounded-xl" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
              <Icon name="heroicons:map-pin" class="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
              <div class="min-w-0">
                <p class="text-xs text-[var(--text-muted)]">Адрес</p>
                <p class="text-sm text-[var(--text-primary)] truncate">{{ accountStore.account?.address || 'Не указан' }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UiCard>

    <!-- =====================================================================
         TABS — переключение между разделами
         ===================================================================== -->
    <div class="flex gap-2 overflow-x-auto pb-2 md:hidden">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
        :class="activeTab === tab.id
          ? 'bg-primary text-white'
          : 'text-[var(--text-muted)] bg-[var(--glass-bg)] hover:text-[var(--text-primary)] hover:bg-white/10'"
      >
        <Icon :name="tab.icon" class="w-4 h-4" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Desktop layout: sticky nav + content -->
    <div class="grid md:grid-cols-[280px_1fr] gap-6">
      <aside class="hidden md:block">
        <UiCard class="p-2 sticky top-24">
          <div class="flex flex-col gap-1">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 text-left"
              :class="activeTab === tab.id
                ? 'bg-primary/10 text-primary'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]'"
              @click="activeTab = tab.id"
            >
              <Icon :name="tab.icon" class="w-5 h-5" />
              <span class="flex-1">{{ tab.label }}</span>
              <Icon v-if="activeTab === tab.id" name="heroicons:chevron-right" class="w-4 h-4 opacity-70" />
            </button>
          </div>
        </UiCard>
      </aside>

      <section class="min-w-0">
    <!-- =====================================================================
         PERSONAL TAB — персональные данные
         ===================================================================== -->
    <div v-if="activeTab === 'personal'" class="space-y-6">
      <!-- Avatar -->
      <ProfileAvatar />
      <!-- ФИО, дата рождения -->
      <ProfilePersonalInfo />
      <!-- Телефон, email -->
      <ProfileContactInfo />
      <!-- Привязка Telegram -->
      <ProfileTelegramLink />
    </div>

    <!-- =====================================================================
         CONTRACT TAB — информация о договоре
         ===================================================================== -->
    <div v-if="activeTab === 'contract'" class="space-y-6">
      <ProfileContractInfo />
      <ProfileAddressInfo />
    </div>
      </section>
    </div>
  </div>
</template>
