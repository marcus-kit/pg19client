<script setup lang="ts">
/**
 * Default Layout — основной layout личного кабинета
 * Включает: шапку, контент, мобильную навигацию
 */

const userStore = useUserStore()
const accountStore = useAccountStore()
const { logout } = useAuthInit()
const route = useRoute()
const colorMode = useColorMode()

// Heartbeat для онлайн-статуса пользователя
const { startHeartbeat, stopHeartbeat } = usePresenceHeartbeat()

// -----------------------------------------------------------------------------
// Навигация
// -----------------------------------------------------------------------------

// Полная навигация (desktop header)
const navigation = [
  { name: 'Главная', href: '/dashboard', icon: 'heroicons:home' },
  { name: 'Соседи', href: '/community', icon: 'heroicons:user-group' },
  { name: 'Услуги', href: '/services', icon: 'heroicons:squares-2x2' },
  { name: 'Счета', href: '/invoices', icon: 'heroicons:document-text' },
  { name: 'Поддержка', href: '/support', icon: 'heroicons:chat-bubble-left-right' },
  { name: 'Профиль', href: '/profile', icon: 'heroicons:user' }
]

// Основные пункты мобильной навигации (4 + кнопка "Ещё")
const mobileMainNav = [
  { name: 'Главная', href: '/dashboard', icon: 'heroicons:home' },
  { name: 'Услуги', href: '/services', icon: 'heroicons:squares-2x2' },
  { name: 'Соседи', href: '/community', icon: 'heroicons:user-group' },
  { name: 'Счета', href: '/invoices', icon: 'heroicons:document-text' }
]

// Дополнительные пункты в меню "Ещё"
const mobileMoreNav = [
  { name: 'Поддержка', href: '/support', icon: 'heroicons:chat-bubble-left-right' },
  { name: 'Профиль', href: '/profile', icon: 'heroicons:user' }
]

// Проверка активного пункта меню
const isActive = (href: string) => route.path === href || route.path.startsWith(href + '/')
const isMoreActive = computed(() => mobileMoreNav.some(item => isActive(item.href)))

// -----------------------------------------------------------------------------
// Состояние UI
// -----------------------------------------------------------------------------

const isScrolled = ref(false)        // Шапка при скролле
const showMoreMenu = ref(false)      // Мобильное меню "Ещё"

// Переключение темы
const toggleTheme = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// Выход из аккаунта
const handleLogout = () => {
  showMoreMenu.value = false
  logout()
  navigateTo('/login')
}

// -----------------------------------------------------------------------------
// Lifecycle
// -----------------------------------------------------------------------------

onMounted(() => {
  startHeartbeat()

  // Отслеживание скролла для эффекта шапки
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

    <!-- ===================================================================
         HEADER (Desktop + Mobile top bar)
         =================================================================== -->
    <header
      class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      :class="isScrolled ? 'header-blur shadow-lg' : 'header-transparent'"
    >
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between h-16">

          <!-- Логотип -->
          <NuxtLink to="/" class="flex items-center gap-3">
            <img src="/logo.png" alt="ПЖ19" class="h-8" />
          </NuxtLink>

          <!-- Desktop навигация -->
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

          <!-- Desktop: инфо пользователя и действия -->
          <div class="hidden md:flex items-center gap-3">
            <!-- Переключатель темы -->
            <button
              @click="toggleTheme"
              class="theme-toggle"
              :title="colorMode.value === 'dark' ? 'Светлая тема' : 'Тёмная тема'"
            >
              <Icon
                :name="colorMode.value === 'dark' ? 'heroicons:sun' : 'heroicons:moon'"
                class="w-5 h-5"
              />
            </button>

            <!-- Имя и договор -->
            <div class="text-right">
              <p class="text-sm font-medium text-[var(--text-primary)]">{{ userStore.shortName }}</p>
              <p class="text-xs text-[var(--text-muted)]">Договор {{ accountStore.account?.contractNumber }}</p>
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

          <!-- Mobile: действия в шапке -->
          <div class="flex md:hidden items-center gap-2">
            <button
              @click="toggleTheme"
              class="p-2 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors"
            >
              <Icon
                :name="colorMode.value === 'dark' ? 'heroicons:sun' : 'heroicons:moon'"
                class="w-5 h-5"
              />
            </button>
            <NuxtLink
              to="/profile"
              class="p-2 text-[var(--text-muted)] hover:text-primary rounded-lg transition-colors"
            >
              <Icon name="heroicons:user-circle" class="w-6 h-6" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <!-- ===================================================================
         CONTENT
         =================================================================== -->
    <main class="flex-1 pt-16 pb-20 md:pb-0">
      <div class="container mx-auto px-4 py-6">
        <slot />
      </div>
    </main>

    <!-- ===================================================================
         MOBILE BOTTOM NAVIGATION
         =================================================================== -->
    <div class="md:hidden">
      <!-- Нижняя панель навигации -->
      <nav
        class="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg border-t safe-area-bottom"
        style="background: var(--header-blur-bg); border-color: var(--glass-border);"
      >
        <div class="flex items-center justify-around h-16 px-2">
          <!-- Основные пункты -->
          <NuxtLink
            v-for="item in mobileMainNav"
            :key="item.href"
            :to="item.href"
            class="flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors"
            :class="isActive(item.href) ? 'text-primary' : 'text-[var(--text-muted)]'"
            @click="showMoreMenu = false"
          >
            <Icon :name="item.icon" class="w-6 h-6" />
            <span class="text-xs font-medium">{{ item.name }}</span>
          </NuxtLink>

          <!-- Кнопка "Ещё" -->
          <button
            @click="showMoreMenu = !showMoreMenu"
            class="flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors"
            :class="showMoreMenu || isMoreActive ? 'text-primary' : 'text-[var(--text-muted)]'"
          >
            <Icon name="heroicons:ellipsis-horizontal" class="w-6 h-6" />
            <span class="text-xs font-medium">Ещё</span>
          </button>
        </div>
      </nav>

      <!-- Меню "Ещё" -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        leave-active-class="transition-all duration-150 ease-in"
        enter-from-class="opacity-0 translate-y-4"
        leave-to-class="opacity-0 translate-y-4"
      >
        <div
          v-if="showMoreMenu"
          class="fixed bottom-16 left-0 right-0 z-50 p-4 safe-area-bottom"
          style="background: var(--bg-surface); border-top: 1px solid var(--glass-border);"
        >
          <div class="flex flex-col gap-1">
            <NuxtLink
              v-for="item in mobileMoreNav"
              :key="item.href"
              :to="item.href"
              class="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
              :class="isActive(item.href) ? 'text-primary bg-primary/10' : 'text-[var(--text-secondary)] active:bg-[var(--glass-bg)]'"
              @click="showMoreMenu = false"
            >
              <Icon :name="item.icon" class="w-5 h-5" />
              <span class="font-medium">{{ item.name }}</span>
            </NuxtLink>

            <div class="my-2 h-px" style="background: var(--glass-border);" />

            <!-- Кнопка выхода -->
            <button
              @click="handleLogout"
              class="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 active:bg-red-500/10 transition-colors w-full"
            >
              <Icon name="heroicons:arrow-right-on-rectangle" class="w-5 h-5" />
              <span class="font-medium">Выйти</span>
            </button>
          </div>
        </div>
      </Transition>

      <!-- Backdrop для меню "Ещё" -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showMoreMenu"
          class="fixed inset-0 z-40"
          style="background: rgba(0, 0, 0, 0.5);"
          @click="showMoreMenu = false"
        />
      </Transition>
    </div>
  </div>
</template>

<style scoped>
/* Safe area для iPhone с notch */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
