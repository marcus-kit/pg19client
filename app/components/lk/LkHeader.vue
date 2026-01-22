<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const colorMode = useColorMode()
const isScrolled = ref(false)

// Основная навигация (для desktop и mobile bottom nav)
const navigation = [
  { name: 'Главная', href: '/dashboard', icon: 'heroicons:home' },
  { name: 'Соседи', href: '/community', icon: 'heroicons:user-group' },
  { name: 'Услуги', href: '/services', icon: 'heroicons:squares-2x2' },
  { name: 'Счета', href: '/invoices', icon: 'heroicons:document-text' },
  { name: 'Поддержка', href: '/support', icon: 'heroicons:chat-bubble-left-right' },
  { name: 'Профиль', href: '/profile', icon: 'heroicons:user' }
]

const isActive = (href: string) => route.path === href || route.path.startsWith(href + '/')

const toggleTheme = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const handleLogout = () => {
  authStore.logout()
  navigateTo('/login')
}

onMounted(() => {
  const handleScroll = () => {
    isScrolled.value = window.scrollY > 20
  }
  window.addEventListener('scroll', handleScroll)
  onUnmounted(() => window.removeEventListener('scroll', handleScroll))
})
</script>

<template>
  <header
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    :class="isScrolled ? 'header-blur shadow-lg' : 'header-transparent'"
  >
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-3">
          <img src="/logo.png" alt="ПЖ19" class="h-8" />
        </NuxtLink>

        <!-- Desktop Navigation -->
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

        <!-- User Info & Actions (Desktop) -->
        <div class="hidden md:flex items-center gap-3">
          <!-- Theme Toggle -->
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

          <div class="text-right">
            <p class="text-sm font-medium text-[var(--text-primary)]">{{ authStore.shortName }}</p>
            <p class="text-xs text-[var(--text-muted)]">Договор {{ authStore.account?.contractNumber }}</p>
          </div>
          <button
            @click="handleLogout"
            class="p-2 text-[var(--text-muted)] hover:text-primary hover:bg-[var(--glass-bg)] rounded-lg transition-colors"
            title="Выйти"
          >
            <Icon name="heroicons:arrow-right-on-rectangle" class="w-5 h-5" />
          </button>
        </div>

        <!-- Mobile Actions -->
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
</template>
