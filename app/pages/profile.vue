<script setup lang="ts">
/**
 * Страница профиля — объединённые данные:
 * - Персональные данные — ФИО, контакты, Telegram
 * - Договор — информация о договоре и адресе
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
const { logout } = useAuthInit()

// =============================================================================
// STATE
// =============================================================================

const route = useRoute()

// Подсветка блока прогресса
const highlightProgress = ref(false)

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

// =============================================================================
// LIFECYCLE — обработка подсветки блока прогресса
// =============================================================================

// Проверка query параметра для подсветки
watch(() => route.query.highlight, (value) => {
  if (value === 'progress') {
    highlightProgress.value = true
    // Убираем подсветку через 0.7 секунды
    setTimeout(() => {
      highlightProgress.value = false
      // Очищаем query параметр
      navigateTo({ query: {} }, { replace: true })
    }, 700)
  }
}, { immediate: true })

// Проверка при монтировании
onMounted(() => {
  if (route.query.highlight === 'progress') {
    highlightProgress.value = true
    setTimeout(() => {
      highlightProgress.value = false
      navigateTo({ query: {} }, { replace: true })
    }, 700)
  }
})

// Выход из личного кабинета (на мобилке кнопка в футере убрана — выход только здесь)
const isLoggingOut = ref(false)
async function handleLogout(): Promise<void> {
  isLoggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } finally {
    logout()
    navigateTo('/login')
    isLoggingOut.value = false
  }
}
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
         PROFILE CONTENT — объединённые данные профиля
         ===================================================================== -->
    <div class="space-y-6">
      <!-- Персональные данные и Контакты в ряд на десктопе -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Персональные данные (ФИО, дата рождения) -->
        <ProfilePersonalInfo />
        <!-- Контакты + привязки Telegram/VK -->
        <div class="space-y-4">
          <ProfileContactInfo />
          <ProfileVkLink />
        </div>
      </div>

      <!-- Информация о договоре -->
      <ProfileContractInfo />
      <ProfileAddressInfo />

      <!-- Выход из личного кабинета (компактно на мобилке) -->
      <div class="pt-2 md:pt-4 border-t" style="border-color: var(--glass-border);">
        <button
          type="button"
          :disabled="isLoggingOut"
          class="flex items-center justify-center w-full px-3 py-2 md:px-4 md:py-3 rounded-lg md:rounded-xl text-base md:text-lg text-red-400 hover:bg-red-500/10 active:bg-red-500/15 transition-colors font-medium disabled:opacity-50"
          @click="handleLogout"
        >
          <span class="inline-flex items-center justify-center gap-1.5 md:gap-2">
            <Icon v-if="isLoggingOut" name="heroicons:arrow-path" class="w-4 h-4 md:w-5 md:h-5 animate-spin shrink-0" />
            <Icon v-else name="heroicons:arrow-right-on-rectangle" class="w-4 h-4 md:w-5 md:h-5 shrink-0" />
            <span class="text-center">{{ isLoggingOut ? 'Выход...' : 'Выйти из личного кабинета' }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
