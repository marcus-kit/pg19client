<script setup lang="ts">
/**
 * RelativeTime - client-only component for relative time display
 * Prevents hydration mismatch by rendering only on client
 */
interface Props {
  date: string | null | undefined
  fallback?: string
}

const props = withDefaults(defineProps<Props>(), {
  fallback: '—'
})

const { formatRelativeDate } = useFormatters()

// Render placeholder on server, actual value on client
const displayValue = ref(props.fallback)
const mounted = ref(false)

onMounted(() => {
  mounted.value = true
  if (props.date) {
    displayValue.value = formatRelativeDate(props.date)
  }
})

// Update every minute for "X мин. назад" accuracy
let interval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  interval = setInterval(() => {
    if (props.date) {
      displayValue.value = formatRelativeDate(props.date)
    }
  }, 60000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})

// React to prop changes
watch(() => props.date, (newDate) => {
  if (mounted.value && newDate) {
    displayValue.value = formatRelativeDate(newDate)
  } else if (!newDate) {
    displayValue.value = props.fallback
  }
})
</script>

<template>
  <span>{{ displayValue }}</span>
</template>
