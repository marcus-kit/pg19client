/**
 * Auth Middleware — защита роутов авторизацией
 */
import type { Pinia } from 'pinia'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const nuxtApp = useNuxtApp()
  const userStore = useUserStore(nuxtApp.$pinia as Pinia)

  const publicRoutes = ['/login']
  const isPublicRoute = publicRoutes.includes(to.path)

  if (!userStore.isAuthenticated && !isPublicRoute) {
    return navigateTo('/login')
  }

  if (userStore.isAuthenticated && isPublicRoute) {
    return navigateTo('/dashboard')
  }
})
