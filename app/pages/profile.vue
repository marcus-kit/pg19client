<script setup lang="ts">
/**
 * Страница профиля — 5 вкладок:
 * 1. Профиль — аватар, достижения, реферальная программа
 * 2. Персональные данные — ФИО, контакты, Telegram
 * 3. Договор — информация о договоре и адресе
 * 4. Уведомления — настройки оповещений
 * 5. Безопасность — сессии, выход
 *
 * Особенности:
 * - Прогресс-бар заполненности профиля
 * - Уровни профиля (Новичок → Мастер)
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
const activeTab = ref<'profile' | 'personal' | 'contract' | 'notifications' | 'security'>('profile')

// Конфигурация вкладок
const tabs = [
  { id: 'profile' as const, label: 'Профиль', icon: 'heroicons:user-circle' },
  { id: 'personal' as const, label: 'Персональные данные', icon: 'heroicons:identification' },
  { id: 'contract' as const, label: 'Договор', icon: 'heroicons:document-text' },
  { id: 'notifications' as const, label: 'Уведомления', icon: 'heroicons:bell' },
  { id: 'security' as const, label: 'Безопасность', icon: 'heroicons:shield-check' }
]

function goToField(fieldName: string) {
  const map: Record<string, typeof activeTab.value> = {
    Фото: 'profile',
    Имя: 'personal',
    Фамилия: 'personal',
    Отчество: 'personal',
    'Дата рождения': 'personal',
    Телефон: 'personal',
    Email: 'personal',
    Telegram: 'personal',
    'VK ID': 'personal'
  }
  activeTab.value = map[fieldName] || 'personal'
}

const contractStatus = computed(() => (accountStore.isBlocked ? 'Приостановлен' : 'Активен'))
const contractStatusVariant = computed(() => (accountStore.isBlocked ? 'danger' : 'success') as const)

// =============================================================================
// COMPUTED — прогресс заполнения профиля
// =============================================================================

// Поля профиля с весами (points)
const profileFields = computed(() => [
  { name: 'Фото', filled: !!userStore.user?.avatar, points: 10 },
  { name: 'Имя', filled: !!userStore.user?.firstName, points: 10 },
  { name: 'Фамилия', filled: !!userStore.user?.lastName, points: 10 },
  { name: 'Отчество', filled: !!userStore.user?.middleName, points: 5 },
  { name: 'Дата рождения', filled: !!userStore.user?.birthDate, points: 10 },
  { name: 'Телефон', filled: !!userStore.user?.phone, points: 15 },
  { name: 'Email', filled: !!userStore.user?.email, points: 15 },
  { name: 'Telegram', filled: !!userStore.user?.telegramId, points: 10 },
  { name: 'VK ID', filled: !!userStore.user?.vkId, points: 15 }
])

// Сумма заполненных полей
const completedPoints = computed(() =>
  profileFields.value.filter(f => f.filled).reduce((sum, f) => sum + f.points, 0)
)

// Максимальная сумма (100)
const totalPoints = computed(() =>
  profileFields.value.reduce((sum, f) => sum + f.points, 0)
)

// Процент заполнения
const completionPercent = computed(() =>
  Math.round((completedPoints.value / totalPoints.value) * 100)
)

// Незаполненные поля (для подсказки)
const missingFields = computed(() =>
  profileFields.value.filter(f => !f.filled)
)

// Уровень профиля (зависит от процента заполнения)
const levelInfo = computed(() => {
  const percent = completionPercent.value
  if (percent >= 100) return { level: 'Мастер', color: 'from-yellow-400 to-amber-500', icon: 'heroicons:star' }
  if (percent >= 80) return { level: 'Эксперт', color: 'from-purple-400 to-purple-600', icon: 'heroicons:academic-cap' }
  if (percent >= 50) return { level: 'Продвинутый', color: 'from-blue-400 to-blue-600', icon: 'heroicons:arrow-trending-up' }
  return { level: 'Новичок', color: 'from-gray-400 to-gray-600', icon: 'heroicons:user' }
})
</script>

<template>
  <div class="space-y-6">
    <!-- =====================================================================
         PAGE HEADER
         ===================================================================== -->
    <div>
      <h1 class="text-2xl font-bold text-[var(--text-primary)]">Профиль</h1>
      <p class="text-[var(--text-muted)] mt-1">Управление личными данными</p>
    </div>

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

        <div class="flex flex-wrap gap-2 mt-4">
          <button
            class="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
            @click="activeTab = 'personal'"
          >
            Редактировать личные данные
          </button>
          <button
            class="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
            @click="activeTab = 'contract'"
          >
            Договор и адрес
          </button>
          <button
            class="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
            @click="activeTab = 'security'"
          >
            Безопасность
          </button>
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
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
        :class="activeTab === tab.id
          ? 'bg-primary text-white'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
        :style="activeTab !== tab.id ? 'background: var(--glass-bg);' : ''"
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
              class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left"
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
         PROFILE TAB — аватар, достижения, реферальная программа
         ===================================================================== -->
    <div v-if="activeTab === 'profile'" class="space-y-6">
      <!-- Карточка прогресса заполнения профиля -->
      <UiCard class="p-0 overflow-hidden">
        <div class="px-5 py-4">
          <div class="flex items-center gap-4">
            <!-- Level Icon -->
            <div :class="['w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', levelInfo.color]">
              <Icon :name="levelInfo.icon" class="w-5 h-5 text-white" />
            </div>

            <!-- Progress Section -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-sm font-medium text-[var(--text-primary)]">{{ levelInfo.level }}</span>
                <span class="text-sm font-bold text-primary">{{ completionPercent }}%</span>
              </div>
              <!-- Progress Bar -->
              <div class="relative h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-white/10">
                <div
                  class="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                  :style="{ width: `${completionPercent}%` }"
                />
              </div>
            </div>

            <!-- Missing Fields (compact) -->
            <div v-if="missingFields.length > 0" class="hidden sm:flex items-center gap-2 flex-shrink-0">
              <span class="text-xs text-[var(--text-muted)]">Заполните:</span>
              <div class="flex gap-1">
                <span
                  v-for="field in missingFields.slice(0, 3)"
                  :key="field.name"
                  class="px-2 py-0.5 text-xs rounded-full text-[var(--text-secondary)] hover:bg-primary/20 hover:text-primary cursor-pointer transition-colors bg-gray-100 dark:bg-white/5"
                  title="Нажмите, чтобы перейти к разделу"
                  @click="goToField(field.name)"
                >
                  {{ field.name }}
                </span>
                <span v-if="missingFields.length > 3" class="px-2 py-0.5 text-xs rounded-full text-[var(--text-muted)] bg-gray-100 dark:bg-white/5">
                  +{{ missingFields.length - 3 }}
                </span>
              </div>
            </div>
            <div v-else class="hidden sm:flex items-center gap-1 text-accent flex-shrink-0">
              <Icon name="heroicons:check-circle" class="w-4 h-4" />
              <span class="text-xs font-medium">Заполнен</span>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- Achievements -->
      <ProfileAchievements />

      <!-- Referral Program -->
      <ProfileReferral />
    </div>

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

    <!-- =====================================================================
         NOTIFICATIONS TAB — настройки уведомлений
         ===================================================================== -->
    <div v-if="activeTab === 'notifications'" class="space-y-6">
      <ProfileNotifications />
    </div>

    <!-- =====================================================================
         SECURITY TAB — сессии и безопасность
         ===================================================================== -->
    <div v-if="activeTab === 'security'" class="space-y-6">
      <ProfileSecurity />
    </div>
      </section>
    </div>
  </div>
</template>
