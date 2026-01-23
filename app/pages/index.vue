<script setup lang="ts">
/**
 * Index Page — редирект на дашборд
 *
 * Страница нужна чтобы Nuxt не возвращал 404 на /
 * Middleware auth.ts перенаправит на /dashboard или /login
 */
definePageMeta({
  middleware: 'auth'
})

// Fallback редирект (если middleware не сработал на сервере)
if (import.meta.client) {
  const userStore = useUserStore()
  navigateTo(userStore.isAuthenticated ? '/dashboard' : '/login')
}
</script>

<template>
  <div />
</template>
