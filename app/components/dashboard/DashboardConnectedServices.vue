<script setup lang="ts">
/**
 * DashboardConnectedServices — список подключенных услуг пользователя
 *
 * Отображает карточки с информацией о каждой подключенной услуге:
 * - Название и описание
 * - Статус (активна/приостановлена/отменена)
 * - Цена
 * - Кнопка "Подробнее"
 */

import type { Service, Subscription, SubscriptionStatus } from '~/types/service'
import { subscriptionStatusLabels, subscriptionStatusColors } from '~/types/service'
import { formatKopeks } from '~/composables/useFormatters'

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const { fetchSubscriptions } = useServices()

// =============================================================================
// DATA — загрузка подписок
// =============================================================================

const { subscriptions } = await fetchSubscriptions()

// =============================================================================
// METHODS
// =============================================================================

// Получить цену подписки (индивидуальная или стандартная)
function getSubscriptionPrice(sub: Subscription): number {
  return sub.customPrice ?? sub.service?.priceMonthly ?? 0
}

// Получить CSS-класс для бейджа статуса
function getStatusColor(status: SubscriptionStatus): string {
  const colorMap: Record<string, string> = {
    green: 'bg-accent/20 text-accent',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    gray: 'bg-gray-600/20 text-gray-400'
  }
  const color = subscriptionStatusColors[status] as string
  return (color in colorMap ? colorMap[color] : colorMap.gray) as string
}

// Получить иконку услуги
function getServiceIcon(service: Service | undefined): string {
  return service?.icon || 'heroicons:cube'
}
</script>

<template>
  <section>
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
                <p class="text-sm text-[var(--text-muted)] mt-0.5">{{ sub.service?.description || '' }}</p>
              </div>
              <UiBadge :class="getStatusColor(sub.status)">
                {{ subscriptionStatusLabels[sub.status] }}
              </UiBadge>
            </div>
            <div class="flex items-center justify-between mt-4">
              <span class="text-lg font-bold text-[var(--text-primary)]">
                {{ formatKopeks(getSubscriptionPrice(sub)) }}
                <span class="text-sm font-normal text-[var(--text-muted)]">руб/мес</span>
              </span>
              <NuxtLink to="/services">
                <button class="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  Подробнее
                </button>
              </NuxtLink>
            </div>
          </div>
        </div>
      </UiCard>
    </div>
    <UiCard v-else padding="lg">
      <UiEmptyState
        icon="heroicons:cube"
        title="Нет подключенных услуг"
      >
        <NuxtLink to="/services">
          <UiButton variant="secondary" class="mt-4">
            Выберите услугу для подключения
          </UiButton>
        </NuxtLink>
      </UiEmptyState>
    </UiCard>
  </section>
</template>