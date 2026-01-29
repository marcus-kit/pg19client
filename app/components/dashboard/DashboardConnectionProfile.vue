<script setup lang="ts">
/**
 * DashboardConnectionProfile — карточка информации о пользователе
 *
 * Отображает ФИО, номер договора и кнопку перехода в личные данные.
 */

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const userStore = useUserStore()
const accountStore = useAccountStore()

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

// =============================================================================
// COMPUTED — адаптивный размер ФИО на мобилке (чем длиннее — тем меньше)
// =============================================================================

const fullNameTextClass = computed(() => {
  const name = (userStore.fullName || '').trim()
  const len = name.length

  // Desktop оставляем как было (text-lg). На мобилке уменьшаем только при длинных ФИО.
  if (len >= 34) return 'text-sm md:text-lg'
  if (len >= 26) return 'text-base md:text-lg'
  return 'text-lg md:text-lg'
})

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
  <UiCard hover>
    <div class="flex items-start justify-between mb-4">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <p class="text-sm text-[var(--text-muted)]">Пользователь</p>
          <NuxtLink to="/profile?highlight=progress" class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-80"
            :class="`bg-gradient-to-r ${levelInfo.color}`">
            <Icon :name="levelInfo.icon" class="w-3 h-3" />
            <span>{{ levelInfo.level }}</span>
          </NuxtLink>
        </div>
        <p :class="[fullNameTextClass, 'font-semibold text-[var(--text-primary)] break-words']">
          {{ userStore.fullName || 'Не указано' }}
        </p>
      </div>
      <div class="icon-container overflow-hidden">
        <img
          v-if="userStore.user?.avatar"
          :src="userStore.user.avatar"
          :alt="userStore.fullName"
          class="w-full h-full object-cover"
        />
        <Icon
          v-else
          name="heroicons:user-circle"
          class="w-6 h-6 text-primary"
        />
      </div>
    </div>

    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-[var(--text-muted)]">
        <Icon name="heroicons:document-text" class="w-4 h-4" />
        <span class="text-sm">
          Договор № <span class="text-[var(--text-primary)] font-medium">{{ accountStore.account?.contractNumber || '—' }}</span>
        </span>
      </div>
      <NuxtLink to="/profile">
        <UiButton size="sm" variant="secondary">
          Личные данные
        </UiButton>
      </NuxtLink>
    </div>
  </UiCard>
</template>
