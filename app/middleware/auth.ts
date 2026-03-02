/**
 * Auth Middleware — защита роутов авторизацией
 * При пустом store пробует гидратировать из сессии (нужно после входа через OIDC/редирект)
 */
import type { Pinia } from 'pinia'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const nuxtApp = useNuxtApp()
  const pinia = nuxtApp.$pinia as Pinia
  const userStore = useUserStore(pinia)

  const publicRoutes = ['/login']
  const isPublicRoute = publicRoutes.includes(to.path)

  // Store пуст, но может быть сессия (вход через Telegram OIDC и т.д.)
  if (!userStore.isAuthenticated && !isPublicRoute) {
    try {
      const data = await $fetch<{ user: any; account: any }>('/api/auth/session')
      const { init } = useAuthInit()
      await init(data.user, data.account)
      return
    } catch {
      return navigateTo('/login')
    }
  }

  if (userStore.isAuthenticated && isPublicRoute) {
    return navigateTo('/dashboard')
  }
})
