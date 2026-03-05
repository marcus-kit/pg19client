<script setup lang="ts">
/**
 * Default Layout — основной layout личного кабинета
 *
 * Структура:
 * - Фиксированная шапка (desktop: навигация + профиль, mobile: логотип + иконки)
 * - Основной контент (<slot />)
 * - Мобильная нижняя навигация (4 пункта + "Ещё")
 *
 * Особенности:
 * - Шапка меняет стиль при скролле (blur эффект)
 * - Heartbeat для онлайн-статуса пользователя
 * - Адаптивная навигация (md: breakpoint)
 */

const userStore = useUserStore()
const accountStore = useAccountStore()
const { logout } = useAuthInit()
const route = useRoute()
const { themeIcon, themeLabel, cycleTheme } = useThemeDetect()

// Heartbeat — отправляет пинг на сервер каждые N секунд для онлайн-статуса
const { startHeartbeat, stopHeartbeat } = usePresenceHeartbeat()

// -----------------------------------------------------------------------------
// Навигация
// -----------------------------------------------------------------------------

// Desktop навигация — все пункты в шапке
const navigation = [
  { name: 'Главная', href: '/dashboard', icon: 'heroicons:home' },
  { name: 'Счета', href: '/invoices', icon: 'heroicons:document-text' },
  { name: 'Профиль', href: '/profile', icon: 'heroicons:user' },
  { name: 'Поддержка', href: '/support', icon: 'heroicons:chat-bubble-left-right' }
]

// Mobile навигация — 4 основных пункта в нижней панели
const mobileMainNav = [
  { name: 'Главная', href: '/dashboard', icon: 'heroicons:home' },
  { name: 'Счета', href: '/invoices', icon: 'heroicons:document-text' },
  { name: 'Профиль', href: '/profile', icon: 'heroicons:user' },
  { name: 'Поддержка', href: '/support', icon: 'heroicons:chat-bubble-left-right' }
]

// Проверка активного пункта (точное совпадение или вложенный путь)
const isActive = (href: string) => route.path === href || route.path.startsWith(href + '/')

// -----------------------------------------------------------------------------
// Состояние UI
// -----------------------------------------------------------------------------

const isScrolled = ref(false)

// Выход из аккаунта (desktop: кнопка в шапке; mobile: кнопка внизу страницы профиля)
async function handleLogout(): Promise<void> {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } finally {
    logout()
    navigateTo('/login')
  }
}

// -----------------------------------------------------------------------------
// Lifecycle
// -----------------------------------------------------------------------------

onMounted(() => {
  // Запуск heartbeat для онлайн-статуса
  startHeartbeat()

  // Отслеживание скролла — добавляет blur эффект шапке
  const handleScroll = () => {
    isScrolled.value = window.scrollY > 20
  }
  window.addEventListener('scroll', handleScroll)
  onUnmounted(() => window.removeEventListener('scroll', handleScroll))
})

onUnmounted(() => {
  stopHeartbeat()
})
</script>

<template>
  <div class="min-h-screen flex flex-col" style="background-color: var(--bg-base);">

    <!-- =====================================================================
         HEADER — фиксированная шапка
         - Desktop: логотип + навигация + профиль + выход
         - Mobile: логотип + тема + профиль
         ===================================================================== -->
    <header
      class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      :class="isScrolled ? 'header-blur shadow-lg' : 'header-transparent'"
    >
      <div class="container mx-auto max-w-5xl px-4">
        <div class="flex items-center justify-between h-16">

          <!-- Логотип -->
          <NuxtLink to="/dashboard" class="flex items-center gap-3">
            <img src="/logo.png" alt="ПЖ19" class="h-8" />
          </NuxtLink>

          <!-- Desktop навигация (скрыта на mobile) -->
          <nav class="hidden md:flex items-center gap-1">
            <NuxtLink
              v-for="item in navigation"
              :key="item.href"
              :to="item.href"
              class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="isActive(item.href) ? 'text-primary bg-primary/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]'"
            >
              <Icon :name="item.icon" class="w-5 h-5" />
              {{ item.name }}
            </NuxtLink>
          </nav>

          <!-- Desktop: профиль и действия -->
          <div class="hidden md:flex items-center gap-3">
            <!-- Переключатель темы: system -> dark -> light -->
            <button
              @click="cycleTheme"
              class="theme-toggle"
              :title="themeLabel"
            >
              <Icon
                :name="themeIcon"
                class="w-5 h-5"
              />
            </button>

            <!-- Имя пользователя и номер договора -->
            <div class="text-right">
              <p class="text-sm font-medium text-[var(--text-primary)]">{{ userStore.shortName }}</p>
              <p class="text-xs text-[var(--text-muted)]">Договор {{ accountStore.account?.contractNumber ?? '—' }}</p>
            </div>

            <!-- Кнопка выхода -->
            <button
              @click="handleLogout"
              class="p-2 text-[var(--text-muted)] hover:text-primary hover:bg-[var(--glass-bg)] rounded-lg transition-colors"
              title="Выйти"
            >
              <Icon name="heroicons:arrow-right-on-rectangle" class="w-5 h-5" />
            </button>
          </div>

          <!-- Mobile: иконки в шапке (без кнопки профиля — профиль в нижней панели) -->
          <div class="flex md:hidden items-center gap-2">
            <!-- Переключатель темы: system -> dark -> light -->
            <button
              @click="cycleTheme"
              class="p-2 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors"
              :title="themeLabel"
            >
              <Icon
                :name="themeIcon"
                class="w-5 h-5"
              />
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1 pt-16 pb-20 md:pb-0">
      <div class="container mx-auto max-w-5xl px-4 pt-6">
        <slot />
      </div>
    </main>

    <div class="md:hidden">
      <!-- Нижняя панель навигации -->
      <nav
        class="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg border-t safe-area-bottom"
        style="background: var(--header-blur-bg); border-color: var(--glass-border);"
      >
        <div class="flex items-center justify-between h-16 px-2 gap-2">
          <!-- Основные пункты навигации — равная ширина, одинаковые отступы между кнопками -->
          <NuxtLink
            v-for="item in mobileMainNav"
            :key="item.href"
            :to="item.href"
            class="flex-1 flex flex-col items-center justify-center gap-1 py-2 min-w-0 rounded-lg transition-colors"
            :class="isActive(item.href) ? 'text-primary' : 'text-[var(--text-muted)]'"
          >
            <Icon :name="item.icon" class="w-6 h-6 shrink-0" />
            <span class="text-xs font-medium truncate">{{ item.name }}</span>
          </NuxtLink>
        </div>
      </nav>
    </div>
  </div>
</template>

<style scoped>
/* Safe area — отступ для iPhone с notch/Dynamic Island */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
