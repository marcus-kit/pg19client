/**
 * useAuthInit — оркестрация авторизации и загрузки данных
 *
 * Центральная точка инициализации после логина.
 * Загружает данные во все stores параллельно.
 *
 * Методы:
 * - init — инициализация после успешного логина
 * - logout — очистка всех stores при выходе
 * - refresh — перезагрузка данных в stores
 */
import type { User, Account } from '~/types'

export function useAuthInit() {
  const userStore = useUserStore()
  const accountStore = useAccountStore()
  const notificationsStore = useNotificationsStore()
  const sessionsStore = useSessionsStore()
  const achievementsStore = useAchievementsStore()
  const referralStore = useReferralStore()

  async function init(user: User, account: Account) {
    // Set core data
    userStore.setUser(user)
    accountStore.setAccount(account)

    // Load additional data in parallel
    const [notifications, achievements, sessions, referral] = await Promise.all([
      useNotificationsApi().load(),
      useAchievementsApi().load(user.id),
      useSessionsApi().load(user.id),
      useReferralApi().load(user.id)
    ])

    notificationsStore.set(notifications)
    achievementsStore.set(achievements)
    sessionsStore.set(sessions)
    if (referral) referralStore.set(referral)
  }

  function logout() {
    userStore.logout()
    accountStore.clear()
    notificationsStore.reset()
    sessionsStore.clear()
    achievementsStore.clear()
    referralStore.clear()
  }

  async function refresh() {
    if (!userStore.isAuthenticated || !userStore.user?.id) return

    const userId = userStore.user.id
    const [notifications, achievements, sessions, referral] = await Promise.all([
      useNotificationsApi().load(),
      useAchievementsApi().load(userId),
      useSessionsApi().load(userId),
      useReferralApi().load(userId)
    ])

    notificationsStore.set(notifications)
    achievementsStore.set(achievements)
    sessionsStore.set(sessions)
    if (referral) referralStore.set(referral)
  }

  return { init, logout, refresh }
}
