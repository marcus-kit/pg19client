<script setup lang="ts">
/**
 * ConnectionPhoneInput — поле ввода телефона с маской
 * Использует IMask для форматирования +7 (___) ___-__-__
 * Эмитит только цифры (79991234567) через v-model
 */
import IMask from 'imask'

interface Props {
  modelValue?: string
  label?: string
  error?: string
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  required: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'validation': [isValid: boolean]
}>()

const inputElement = ref<HTMLInputElement | null>(null)
let masked: ReturnType<typeof IMask> | null = null

// Валидация: 11 цифр, начинается с 7
const isValid = computed(() => {
  const digits = props.modelValue.replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('7')
})

// Инициализация маски при монтировании
onMounted(() => {
  if (!inputElement.value) return

  masked = IMask(inputElement.value, {
    mask: '+{7} (000) 000-00-00',
    lazy: false,           // Показывать маску сразу
    placeholderChar: '_'
  })

  // При вводе — эмитим только цифры
  masked.on('accept', () => {
    emit('update:modelValue', masked!.unmaskedValue)
  })

  // Установка начального значения
  if (props.modelValue) {
    masked.unmaskedValue = props.modelValue
  }
})

// Очистка маски при размонтировании
onBeforeUnmount(() => {
  masked?.destroy()
})

// Синхронизация при внешнем изменении (сброс формы)
watch(() => props.modelValue, (newValue) => {
  if (masked && masked.unmaskedValue !== newValue) {
    masked.unmaskedValue = newValue || ''
  }
})

// Эмит валидации при изменении
watch(isValid, (valid) => {
  emit('validation', valid)
}, { immediate: true })
</script>

<template>
  <div class="w-full">
    <!-- Label -->
    <label v-if="label" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
      {{ label }} <span v-if="required" class="text-primary">*</span>
    </label>

    <!-- Input с маской -->
    <input
      ref="inputElement"
      type="tel"
      :required="required"
      class="w-full px-4 py-4 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
      :class="{
        'border-red-500 focus:border-red-500 focus:ring-red-500/20': error,
        'border-[var(--glass-border)]': !error
      }"
      :style="{
        background: 'var(--glass-bg)',
        border: error ? '1px solid rgb(239 68 68)' : '1px solid var(--glass-border)'
      }"
      placeholder="+7 (___) ___-__-__"
    />

    <!-- Ошибка (внешняя) -->
    <p v-if="error" class="mt-1.5 text-sm text-red-400">{{ error }}</p>

    <!-- Ошибка валидации -->
    <p v-else-if="modelValue && !isValid" class="mt-1.5 text-sm text-red-400">
      Введите корректный номер телефона
    </p>
  </div>
</template>
