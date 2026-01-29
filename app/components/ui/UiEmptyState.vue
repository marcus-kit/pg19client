<script setup lang="ts">
/**
 * UiEmptyState — состояние "нет данных"
 *
 * Используется когда:
 * - Список пуст
 * - Поиск не дал результатов
 * - Нет созданных элементов
 *
 * Структура: иконка + заголовок + описание + опциональная кнопка действия
 */

interface Props {
  icon?: string
  title?: string
  description?: string
}

withDefaults(defineProps<Props>(), {
  icon: 'heroicons:inbox',
  title: 'Нет данных',
  description: ''
})
</script>

<template>
  <div class="text-center py-4 md:py-8 empty-state">
    <!-- Иконка -->
    <div class="empty-state-icon w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4" style="background: var(--glass-bg);">
      <Icon :name="icon" class="w-6 h-6 md:w-8 md:h-8 text-[var(--text-muted)]" />
    </div>

    <!-- Заголовок -->
    <h3 class="empty-state-title text-sm md:text-lg font-medium text-[var(--text-primary)] mb-1">
      {{ title }}
    </h3>

    <!-- Описание -->
    <p v-if="description" class="text-xs md:text-sm text-[var(--text-muted)] mb-2 md:mb-4">
      {{ description }}
    </p>

    <!-- Слот для кнопки действия -->
    <slot />
  </div>
</template>
