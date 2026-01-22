<script setup lang="ts">
const route = useRoute()
const { logout } = useAuthInit()

// Основные пункты навигации в нижней панели (5 максимум)
const mainNavigation = [
  { name: 'Главная', href: '/dashboard', icon: 'heroicons:home' },
  { name: 'Услуги', href: '/services', icon: 'heroicons:squares-2x2' },
  { name: 'Соседи', href: '/community', icon: 'heroicons:user-group' },
  { name: 'Счета', href: '/invoices', icon: 'heroicons:document-text' }
]

// Дополнительные пункты в меню "Ещё"
const moreNavigation = [
  { name: 'Поддержка', href: '/support', icon: 'heroicons:chat-bubble-left-right' },
  { name: 'Профиль', href: '/profile', icon: 'heroicons:user' }
]

const showMoreMenu = ref(false)

const isActive = (href: string) => route.path === href || route.path.startsWith(href + '/')
const isMoreActive = computed(() => moreNavigation.some(item => isActive(item.href)))

const handleLogout = () => {
  showMoreMenu.value = false
  logout()
  navigateTo('/login')
}
</script>

<template>
  <div>
    <!-- Bottom Navigation Bar -->
    <nav class="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg border-t safe-area-bottom" style="background: var(--header-blur-bg); border-color: var(--glass-border);">
      <div class="flex items-center justify-around h-16 px-2">
        <!-- Main nav items -->
        <NuxtLink
          v-for="item in mainNavigation"
          :key="item.href"
          :to="item.href"
          class="flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors"
          :class="isActive(item.href) ? 'text-primary' : 'text-[var(--text-muted)]'"
          @click="showMoreMenu = false"
        >
          <Icon :name="item.icon" class="w-6 h-6" />
          <span class="text-xs font-medium">{{ item.name }}</span>
        </NuxtLink>

        <!-- More button -->
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

    <!-- More Menu Popup -->
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
            v-for="item in moreNavigation"
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

    <!-- Backdrop -->
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
</template>

<style scoped>
/* Safe area для iPhone с notch */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
