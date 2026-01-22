export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  const isAuthenticated = !!user.value

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/']
  const isPublicRoute = publicRoutes.includes(to.path)

  // Redirect to login if not authenticated and accessing protected route
  if (!isAuthenticated && !isPublicRoute) {
    return navigateTo('/login')
  }

  // Redirect to dashboard if authenticated and trying to access login
  if (isAuthenticated && to.path === '/login') {
    return navigateTo('/dashboard')
  }

  // Handle index page redirect
  if (to.path === '/' && isAuthenticated) {
    return navigateTo('/dashboard')
  }
})
