<script setup lang="ts">
/**
 * Главная страница (дашборд) — обзор состояния аккаунта:
 * - Баланс и состояние подключения
 * - Реферальная программа
 * - Специальные предложения
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
  <div class="space-y-6">

    <!-- =====================================================================
         MAIN CARDS — баланс и состояние подключения
         ===================================================================== -->
    <div class="grid md:grid-cols-2 gap-4">
      <DashboardConnectionProfile />
      <DashboardBalanceCard />
      <!-- <DashboardConnectionCard /> -->
    </div>

    <!-- =====================================================================
         REFERRAL PROMO — карточка реферальной программы
         ===================================================================== -->
    <DashboardConnectedServices />
    <DashboardReferralCard />

    <!-- =====================================================================
         SPECIAL OFFER — специальное предложение
         ===================================================================== -->
    <section>
      <UiCard class="p-0 overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 to-secondary/5">
        <div class="p-3 md:p-6 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
          <div class="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Icon name="heroicons:gift" class="w-6 h-6 md:w-8 md:h-8 text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2 py-0.5 text-[10px] md:text-xs font-semibold bg-primary/20 text-primary rounded-full">
                Специальное предложение
              </span>
            </div>
            <h3 class="text-base md:text-xl font-bold text-[var(--text-primary)] mb-1">
              ТВ Расширенный — месяц бесплатно
            </h3>
            <p class="text-[var(--text-muted)] text-xs md:text-sm">
              191 канал + кинозалы. Подключите сейчас и смотрите бесплатно до 28 февраля!
            </p>
          </div>
          <div class="flex-shrink-0">
            <UiButton variant="primary" size="sm" class="text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2">
              Подключить
            </UiButton>
          </div>
        </div>
      </UiCard>
    </section>

    <!-- =====================================================================
         COMMUNITY NEWS — блок новостей
         ===================================================================== -->
    <section>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-[var(--text-primary)]">Новости сообщества</h2>
      </div>

      <!-- Загрузка -->
      <div v-if="pending" class="grid md:grid-cols-3 gap-4">
        <UiCard v-for="i in 3" :key="i" class="p-5 animate-pulse">
          <div class="h-3 bg-white/10 rounded w-20 mb-2" />
          <div class="h-5 bg-white/10 rounded w-full mb-2" />
          <div class="h-4 bg-white/10 rounded w-full" />
        </UiCard>
      </div>

      <!-- Ошибка -->
      <div v-else-if="error" class="p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p class="text-red-400 text-center">Не удалось загрузить новости</p>
      </div>

      <!-- Пусто -->
      <div v-else-if="news.length === 0" class="p-8 text-center bg-white/5 rounded-lg">
        <Icon name="heroicons:newspaper" class="w-12 h-12 text-[var(--text-muted)] mx-auto mb-2" />
        <p class="text-[var(--text-muted)]">Новостей пока нет</p>
      </div>

      <!-- Сетка новостей -->
      <div v-else class="grid md:grid-cols-3 gap-4">
        <UiCard
          v-for="item in news"
          :key="item.id"
          hover
          class="p-5 cursor-pointer transition-transform hover:scale-[1.02]"
          @click="openNewsModal(item.id)"
        >
          <div class="flex items-center gap-2 mb-2">
            <p class="text-xs text-[var(--text-muted)]">
              {{ formatDateShort(item.publishedAt) }}
            </p>
            <UiBadge :variant="categoryVariants[item.category]" size="sm">
              {{ categoryLabels[item.category] }}
            </UiBadge>
            <Icon v-if="item.isPinned" name="heroicons:star-solid" class="w-3 h-3 text-primary ml-auto" />
          </div>
          <h3 class="font-medium text-[var(--text-primary)] mb-2">{{ item.title }}</h3>
          <p class="text-sm text-[var(--text-secondary)] line-clamp-2">
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
