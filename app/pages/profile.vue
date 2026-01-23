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
         TABS — переключение между разделами
         ===================================================================== -->
    <div class="flex gap-2 overflow-x-auto pb-2">
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

      <!-- Avatar -->
      <ProfileAvatar />

      <!-- Achievements -->
      <ProfileAchievements />

      <!-- Referral Program -->
      <ProfileReferral />
    </div>

    <!-- =====================================================================
         PERSONAL TAB — персональные данные
         ===================================================================== -->
    <div v-if="activeTab === 'personal'" class="space-y-6">
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
  </div>
</template>
