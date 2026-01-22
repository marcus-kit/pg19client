/**
 * Auth Middleware — защита роутов авторизацией
 *
 * Проверяет статус авторизации пользователя и перенаправляет:
 * - Неавторизованных на /login (если пытаются открыть защищённую страницу)
 * - Авторизованных на /dashboard (если пытаются открыть /login или /)
 */
export default defineNuxtRouteMiddleware((to) => {
  // На сервере пропускаем — localStorage недоступен
  if (import.meta.server) {
    return
  }

  const userStore = useUserStore()

  // Публичные роуты, не требующие авторизации
  const publicRoutes = ['/login', '/']
  const isPublicRoute = publicRoutes.includes(to.path)

  // Не авторизован + защищённый роут → на логин
  if (!userStore.isAuthenticated && !isPublicRoute) {
    return navigateTo('/login')
  }

  // Авторизован + страница логина → на дашборд
  if (userStore.isAuthenticated && to.path === '/login') {
    return navigateTo('/dashboard')
  }

  // Авторизован + главная → на дашборд
  if (to.path === '/' && userStore.isAuthenticated) {
    return navigateTo('/dashboard')
  }
})
