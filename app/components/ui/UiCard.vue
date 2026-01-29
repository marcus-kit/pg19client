<script setup lang="ts">
/**
 * UiCard — карточка с glass-эффектом
 *
 * Использует CSS класс .glass-card из main.css для:
 * - Полупрозрачный фон с blur
 * - Тонкая рамка
 * - Hover-эффект (если hover=true)
 *
 * Padding: none (0), sm (16px), md (24px), lg (32px)
 */

interface Props {
  hover?: boolean                      // Добавить hover-эффект (pointer + подсветка)
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'compact'  // compact — компактно на мобилке
}

withDefaults(defineProps<Props>(), {
  hover: false,
  padding: 'md'
})

// Маппинг padding на Tailwind классы
const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  compact: 'p-3 md:p-6'
}
</script>

<template>
  <div
    class="glass-card rounded-2xl"
    :class="[
      paddingClasses[padding],
      hover && 'cursor-pointer'
    ]"
  >
    <slot />
  </div>
</template>
