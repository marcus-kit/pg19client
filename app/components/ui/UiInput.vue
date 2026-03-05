<script setup lang="ts">
/**
 * UiInput — текстовое поле ввода
 *
 * Особенности:
 * - v-model для двусторонней привязки
 * - Опциональный лейбл над полем
 * - Отображение ошибки валидации (красная рамка + текст)
 * - Glass-стиль (полупрозрачный фон)
 * - Поддержка любого type (text, email, password, number и т.д.)
 */

interface Props {
  modelValue?: string | number
  type?: string
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  modelValue: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

// Удаление кириллицы из строки (для email)
function stripCyrillic(value: string | number): string | number {
  if (typeof value !== 'string') return value
  return value.replace(/[\u0400-\u04FF]/g, '')
}

// Двусторонняя привязка для v-model; для type="email" убираем русские буквы
const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => {
    const out = props.type === 'email' ? stripCyrillic(value as string) : value
    emit('update:modelValue', out)
  }
})
</script>

<template>
  <div class="w-full">
    <!-- Лейбл -->
    <label v-if="label" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
      {{ label }}
    </label>

    <!-- Поле ввода -->
    <input
      v-model="inputValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full px-4 py-3 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      :class="{ 'border-red-500 focus:border-red-500 focus:ring-red-500/20': error }"
      :style="{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)'
      }"
    />

    <!-- Сообщение об ошибке -->
    <p v-if="error" class="mt-1.5 text-sm text-red-400">{{ error }}</p>
  </div>
</template>
