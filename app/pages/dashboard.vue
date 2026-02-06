<script setup lang="ts">
/**
 * Главная страница (дашборд) — обзор состояния аккаунта:
 * - Баланс и состояние подключения
 * - Новости сообщества
 */
import type { NewsCategory } from '~/types/news'
import { formatDateShort } from '~/composables/useFormatters'

definePageMeta({
  middleware: 'auth'
})

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const userStore = useUserStore()
const accountStore = useAccountStore()
const { fetchNews } = useNews()

// =============================================================================
// DATA — загрузка новостей
// =============================================================================

const { news, pending, error } = await fetchNews({ limit: 3, active: true })

// =============================================================================
// STATE — модальное окно новости
// =============================================================================

const selectedNewsId = ref<number | null>(null)

// =============================================================================
// CONSTANTS — маппинг категорий новостей
// =============================================================================

const categoryLabels: Record<NewsCategory, string> = {
  announcement: 'Объявление',
  protocol: 'Протокол',
  notification: 'Уведомление'
}

const categoryVariants: Record<NewsCategory, 'warning' | 'info' | 'success'> = {
  announcement: 'warning',
  protocol: 'info',
  notification: 'success'
}

// =============================================================================
// METHODS
// =============================================================================

// Открыть модалку с новостью
function openNewsModal(id: number): void {
  selectedNewsId.value = id
}

// Закрыть модалку
function closeNewsModal(): void {
  selectedNewsId.value = null
}
</script>

<template>
  <div class="space-y-3 md:space-y-6">
    <!-- =====================================================================
         PAGE HEADER — приветствие и номер договора
         ===================================================================== -->
    <header class="pb-0 md:pb-1">
      <h1 class="text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
        Добро пожаловать, {{ userStore.user?.firstName }}!
      </h1>
      <p class="text-xs md:text-sm text-[var(--text-muted)] mt-1 md:mt-2">Договор № {{ accountStore.account?.contractNumber }}</p>
    </header>

    <!-- =====================================================================
         MAIN CARDS — баланс и состояние подключения
         ===================================================================== -->
    <div class="grid md:grid-cols-2 gap-3 md:gap-4">
      <DashboardBalanceCard />
      <DashboardConnectionCard />
    </div>

    <!-- =====================================================================
         CONNECTED INVOICES — подключенные счета
         ===================================================================== -->
    <DashboardInvoicesBlock />

    <!-- =====================================================================
         COMMUNITY NEWS — блок новостей
         ===================================================================== -->
    <section>
      <h2 class="text-base md:text-lg font-semibold text-[var(--text-primary)] mb-3 md:mb-4">Новости сообщества</h2>

      <!-- Загрузка -->
      <div v-if="pending" class="grid md:grid-cols-3 gap-3 md:gap-4">
        <UiCard v-for="i in 3" :key="i" class="p-3 md:p-5 animate-pulse">
          <div class="h-3 bg-white/10 rounded w-20 mb-2 md:mb-3" />
          <div class="h-4 md:h-5 bg-white/10 rounded w-full mb-2" />
          <div class="h-3 md:h-4 bg-white/10 rounded w-full" />
        </UiCard>
      </div>

      <!-- Ошибка -->
      <div v-else-if="error" class="rounded-xl border border-red-500/20 bg-red-500/10 p-4 md:p-6 text-center">
        <Icon name="heroicons:exclamation-triangle" class="w-8 h-8 md:w-10 md:h-10 text-red-400 mx-auto mb-2" />
        <p class="text-xs md:text-sm text-red-400">Не удалось загрузить новости</p>
      </div>

      <!-- Пусто -->
      <div v-else-if="news.length === 0" class="rounded-xl border border-[var(--glass-border)] p-5 md:p-8 text-center" style="background: var(--glass-bg);">
        <Icon name="heroicons:newspaper" class="w-10 h-10 md:w-12 md:h-12 text-[var(--text-muted)] mx-auto mb-2 md:mb-3" />
        <p class="text-xs md:text-sm text-[var(--text-muted)]">Новостей пока нет</p>
      </div>

      <!-- Сетка новостей -->
      <div v-else class="grid md:grid-cols-3 gap-3 md:gap-4">
        <UiCard
          v-for="item in news"
          :key="item.id"
          hover
          class="p-3 md:p-5 cursor-pointer transition-all duration-200 hover:shadow-lg"
          @click="openNewsModal(item.id)"
        >
          <div class="flex items-center gap-2 mb-2 md:mb-3">
            <span class="text-xs text-[var(--text-muted)]">{{ formatDateShort(item.publishedAt) }}</span>
            <UiBadge :variant="categoryVariants[item.category]" size="sm">
              {{ categoryLabels[item.category] }}
            </UiBadge>
            <Icon v-if="item.isPinned" name="heroicons:star-solid" class="w-3.5 h-3.5 text-primary ml-auto" />
          </div>
          <h3 class="text-sm md:text-base font-semibold text-[var(--text-primary)] mb-1 md:mb-2 line-clamp-2">{{ item.title }}</h3>
          <p class="text-xs md:text-sm text-[var(--text-secondary)] line-clamp-2">
            {{ item.summary || item.content.substring(0, 100) + '...' }}
          </p>
        </UiCard>
      </div>

      <!-- Модалка с деталями новости -->
      <DashboardNewsModal
        v-if="selectedNewsId"
        :news-id="selectedNewsId"
        @close="closeNewsModal"
      />
    </section>
  </div>
</template>
