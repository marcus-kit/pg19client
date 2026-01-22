export default defineNuxtRouteMiddleware((to) => {
  // Skip on server - localStorage not available
  if (import.meta.server) {
    return
  }

  const userStore = useUserStore()

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
  if (to.path === '/' && userStore.isAuthenticated) {
    return navigateTo('/dashboard')
  }
})
