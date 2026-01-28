<script setup lang="ts">
/**
 * Страница услуг — управление подключенными услугами:
 * - Подключенные услуги (subscriptions) — с индивидуальными ценами
 * - Доступные услуги (services) — можно подключить через заявку
 *
 * Подключение создаёт тикет в категории 'connection'
 */
import type { Subscription, Service } from '~/types/service'
import { subscriptionStatusColors } from '~/types/service'
import { formatKopeks } from '~/composables/useFormatters'

definePageMeta({
  middleware: 'auth'
})

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const router = useRouter()
const { fetchServices, fetchSubscriptions } = useServices()
const { createTicket } = useTickets()

// =============================================================================
// DATA — загрузка услуг и подписок параллельно
// =============================================================================

const [servicesData, subscriptionsData] = await Promise.all([
  fetchServices(),
  fetchSubscriptions()
])

const { services, pending: servicesPending, error: servicesError } = servicesData
const { subscriptions, pending: subsPending, error: subsError } = subscriptionsData

// =============================================================================
// STATE
// =============================================================================

// ID услуги, для которой создаётся заявка (для показа спиннера)
const connectingServiceId = ref<number | null>(null)

// =============================================================================
// COMPUTED
// =============================================================================

// Общий флаг загрузки
const pending = computed(() => servicesPending.value || subsPending.value)

// Общая ошибка
const error = computed(() => servicesError.value || subsError.value)

// ID уже подключенных услуг (для фильтрации)
const subscribedServiceIds = computed(() => {
  return new Set(subscriptions.value.map(s => s.serviceId))
})

// Доступные для подключения (не подключенные)
const availableServices = computed(() => {
  return services.value.filter(s => !subscribedServiceIds.value.has(s.id))
})

type ServicesTab = 'my' | 'catalog'

const activeTab = ref<ServicesTab>(subscriptions.value.length ? 'my' : 'catalog')

// =============================================================================
// METHODS
// =============================================================================

// Получить цену подписки (индивидуальная или стандартная)
function getSubscriptionPrice(sub: Subscription): number {
  return sub.customPrice ?? sub.service?.priceMonthly ?? 0
}

// Получить CSS-класс для бейджа статуса
function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    green: 'bg-accent/20 text-accent',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    gray: 'bg-gray-600/20 text-gray-400'
  }
  const statusKey = status as keyof typeof subscriptionStatusColors
  const colorValue = subscriptionStatusColors[statusKey]
  if (!colorValue || typeof colorValue !== 'string') {
    return colorMap.gray
  }
  const result = colorMap[colorValue]
  return result || colorMap.gray
}

function getSubscriptionStatusBadge(status: Subscription['status']): { label: string; variant: 'success' | 'warning' | 'neutral' } {
  if (status === 'active') return { label: 'Подключено', variant: 'success' }
  if (status === 'paused') return { label: 'Приостановлено', variant: 'warning' }
  return { label: 'Архив', variant: 'neutral' }
}

// Получить иконку услуги
function getServiceIcon(service: Service | undefined): string {
  return service?.icon || 'heroicons:cube'
}

// Перезагрузить страницу
function reloadPage(): void {
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

// Создать заявку на подключение услуги
async function requestConnection(service: Service): Promise<void> {
  connectingServiceId.value = service.id
  try {
    const { ticket, error } = await createTicket({
      subject: `Заявка на подключение: ${service.name}`,
      description: `Прошу подключить услугу "${service.name}".\n\nОписание услуги: ${service.description || 'Не указано'}\nСтоимость: ${(service.priceMonthly / 100).toLocaleString('ru-RU')} руб/мес`,
      category: 'connection'
    })

    if (error) {
      console.error('Error creating connection ticket:', error)
      alert('Ошибка при создании заявки. Попробуйте позже.')
      return
    }

    if (ticket) {
      // Редирект на страницу созданного тикета
      router.push(`/support/${ticket.id}`)
    }
  } finally {
    connectingServiceId.value = null
  }
}
</script>

<template>
  <div class="space-y-6" style="scrollbar-gutter: stable;">
    <!-- =====================================================================
         PAGE HEADER
         ===================================================================== -->
    <div>
      <h1 class="text-2xl font-bold text-[var(--text-primary)]">Услуги</h1>
    </div>

    <!-- =====================================================================
         LOADING — скелетон загрузки
         ===================================================================== -->
    <div v-if="pending" class="space-y-6">
      <section>
        <div class="h-6 bg-[var(--glass-bg)] rounded w-40 mb-4"></div>
        <div class="space-y-4">
          <UiCard v-for="i in 2" :key="i" class="animate-pulse">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-[var(--glass-bg)]"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 bg-[var(--glass-bg)] rounded w-1/3"></div>
                <div class="h-3 bg-[var(--glass-bg)] rounded w-1/2"></div>
              </div>
            </div>
          </UiCard>
        </div>
      </section>
    </div>

    <!-- =====================================================================
         ERROR — состояние ошибки
         ===================================================================== -->
    <UiCard v-else-if="error">
      <UiErrorState
        title="Ошибка загрузки"
        description="Не удалось загрузить услуги"
        @retry="reloadPage"
      />
    </UiCard>

    <template v-else>
      <!-- =================================================================
           TABS — мои услуги / каталог
           ================================================================= -->
      <div class="flex flex-col gap-2">
        <div
          class="inline-flex w-fit rounded-xl border px-1 py-1"
          style="background: var(--glass-bg); border-color: var(--glass-border);"
          role="tablist"
          aria-label="Вкладки услуг"
        >
          <button
            type="button"
            role="tab"
            :aria-selected="activeTab === 'my'"
            :tabindex="activeTab === 'my' ? 0 : -1"
            class="px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
            :class="activeTab === 'my' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
            @click="activeTab = 'my'"
          >
            Мои услуги
            <span
              class="ml-2 inline-flex items-center justify-center min-w-6 h-5 px-1 rounded-full text-xs font-bold"
              :class="activeTab === 'my' ? 'bg-primary/15 text-primary' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'"
              style="border: 1px solid var(--glass-border);"
            >
              {{ subscriptions.length }}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="activeTab === 'catalog'"
            :tabindex="activeTab === 'catalog' ? 0 : -1"
            class="px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
            :class="activeTab === 'catalog' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
            @click="activeTab = 'catalog'"
          >
            Каталог услуг
            <span
              class="ml-2 inline-flex items-center justify-center min-w-6 h-5 px-1 rounded-full text-xs font-bold"
              :class="activeTab === 'catalog' ? 'bg-primary/15 text-primary' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'"
              style="border: 1px solid var(--glass-border);"
            >
              {{ availableServices.length }}
            </span>
          </button>
        </div>
        <p class="text-sm text-[var(--text-muted)]">
        </p>
      </div>

      <!-- =================================================================
           SUBSCRIPTIONS — подключенные услуги
           ================================================================= -->
      <section v-if="activeTab === 'my'" class="min-h-[200px]">
        <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-4">Подключенные услуги</h2>
        <div v-if="subscriptions.length" class="grid gap-4">
          <UiCard v-for="sub in subscriptions" :key="sub.id" class="p-0 overflow-hidden">
            <div class="flex items-start gap-4 p-5">
              <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
                <Icon :name="getServiceIcon(sub.service)" class="w-6 h-6 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h3 class="font-semibold text-[var(--text-primary)]">{{ sub.service?.name || 'Услуга' }}</h3>
                    <div class="flex flex-wrap items-center gap-2 mt-1">
                      <UiBadge :variant="getSubscriptionStatusBadge(sub.status).variant" size="sm">
                        {{ getSubscriptionStatusBadge(sub.status).label }}
                      </UiBadge>
                    </div>
                    <p class="text-sm text-[var(--text-muted)] mt-2 line-clamp-2">
                      {{ sub.service?.description || 'Описание отсутствует' }}
                    </p>
                  </div>
                  <!-- legacy color map kept for consistency with existing palette -->
                  <span class="hidden">{{ getStatusColor(sub.status) }}</span>
                </div>
                <div class="flex items-center justify-between mt-4">
                  <div>
                    <div class="text-xl font-extrabold text-[var(--text-primary)] leading-none">
                    {{ formatKopeks(getSubscriptionPrice(sub)) }}
                      <span class="text-xs font-semibold text-[var(--text-muted)] ml-1">руб/мес</span>
                    </div>
                    <p v-if="sub.service?.priceConnection" class="text-xs text-[var(--text-muted)] mt-1">
                      Подключение: <span class="text-[var(--text-secondary)] font-medium">{{ formatKopeks(sub.service.priceConnection) }} ₽</span>
                      <span class="ml-1">разово</span>
                    </p>
                  </div>
                  <button class="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    Подробнее
                  </button>
                </div>
              </div>
            </div>
          </UiCard>
        </div>
        <UiCard v-else padding="lg">
          <UiEmptyState
            icon="heroicons:cube"
            title="Нет подключенных услуг"
            description="Выберите услугу из списка ниже для подключения"
          >
            <UiButton variant="secondary" @click="activeTab = 'catalog'">
              Перейти в каталог
            </UiButton>
          </UiEmptyState>
        </UiCard>
      </section>

      <!-- =================================================================
           AVAILABLE SERVICES — доступные для подключения
           ================================================================= -->
      <section v-else class="min-h-[200px]">
        <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-4">Доступные услуги</h2>
        <div v-if="availableServices.length" class="grid md:grid-cols-2 gap-4">
          <UiCard
            v-for="service in availableServices"
            :key="service.id"
            class="p-0 overflow-hidden hover:border-primary/30 transition-colors cursor-pointer"
          >
            <div class="p-5">
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style="background: var(--glass-bg);">
                  <Icon :name="service.icon || 'heroicons:cube'" class="w-5 h-5 text-[var(--text-muted)]" />
                </div>
                <div class="flex-1">
                  <h3 class="font-medium text-[var(--text-primary)]">{{ service.name }}</h3>
                  <div class="flex flex-wrap items-center gap-2 mt-1">
                    <UiBadge v-if="!service.isActive" variant="neutral" size="sm">Архив</UiBadge>
                    <UiBadge v-else-if="connectingServiceId === service.id" variant="warning" size="sm">В работе</UiBadge>
                  </div>
                  <p class="text-sm text-[var(--text-muted)] mt-2 line-clamp-2">
                    {{ service.description || 'Описание отсутствует' }}
                  </p>
                </div>
              </div>
              <div class="flex items-center justify-between mt-4 pt-4" style="border-top: 1px solid var(--glass-border);">
                <div>
                  <div class="text-xl font-extrabold text-[var(--text-primary)] leading-none">
                  {{ formatKopeks(service.priceMonthly) }}
                    <span class="text-xs font-semibold text-[var(--text-muted)] ml-1">руб/мес</span>
                  </div>
                  <p v-if="service.priceConnection" class="text-xs text-[var(--text-muted)] mt-1">
                    Подключение: <span class="text-[var(--text-secondary)] font-medium">{{ formatKopeks(service.priceConnection) }} ₽</span>
                    <span class="ml-1">разово</span>
                  </p>
                </div>
                <UiButton
                  size="sm"
                  variant="secondary"
                  :loading="connectingServiceId === service.id"
                  @click.stop="requestConnection(service)"
                >
                  {{ connectingServiceId === service.id ? 'Отправка...' : 'Подключить' }}
                </UiButton>
              </div>
            </div>
          </UiCard>
        </div>
        <UiCard v-else padding="lg">
          <UiEmptyState
            icon="heroicons:check-badge"
            title="Все услуги уже подключены"
            description="В каталоге нет доступных услуг для подключения"
          />
        </UiCard>
      </section>
    </template>
  </div>
</template>