export default defineNuxtRouteMiddleware((to) => {
  // DEV BYPASS - удалить для продакшена!
  if (import.meta.dev) {
    return
  }

  // Skip auth check on server - localStorage not available
  if (import.meta.server) {
    return
  }

  const userStore = useUserStore()

  // State восстанавливается через pinia-plugin-persistedstate автоматически
  // или через ручную реализацию в store

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/']
  const isPublicRoute = publicRoutes.includes(to.path)

  // Redirect to login if not authenticated and accessing protected route
  if (!userStore.isAuthenticated && !isPublicRoute) {
    return navigateTo('/login')
  }

  // Redirect to dashboard if authenticated and trying to access login
  if (userStore.isAuthenticated && to.path === '/login') {
    return navigateTo('/dashboard')
  }

  // Handle index page redirect
  if (to.path === '/') {
    if (userStore.isAuthenticated) {
      return navigateTo('/dashboard')
    }
    // Let index.vue handle redirect to login for unauthenticated users
  }
})
