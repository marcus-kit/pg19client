<script setup lang="ts">
/**
 * Раздел «Сообщество» временно отключён.
 * Редирект на главную.
 */
definePageMeta({
  middleware: 'auth'
})

await navigateTo('/dashboard', { replace: true })
</script>

<template>
  <div class="flex items-center justify-center min-h-[50vh]">
    <p class="text-[var(--text-muted)]">Перенаправление...</p>
  </div>
</template>
