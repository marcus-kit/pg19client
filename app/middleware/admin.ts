export default defineNuxtRouteMiddleware((to) => {
  // Пропускаем на сервере
  if (import.meta.server) {
    return
  }

  const userStore = useUserStore()

  // Проверяем авторизацию
  if (!userStore.isAuthenticated) {
    return navigateTo('/login')
  }

  // Проверяем права администратора
  if (!userStore.hasAdminAccess) {
    return navigateTo('/dashboard')
  }
})
