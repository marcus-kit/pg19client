/**
 * useAuthInit — оркестрация авторизации и загрузки данных
 *
 * Pinia instance передаётся явно, т.к. @pinia/nuxt вызывает setActivePinia(void 0)
 * после app:rendered, что деактивирует Pinia. Передача pinia в useStore(pinia)
 * обходит getActivePinia() и работает надёжно.
 */
import type { User, Account } from '~/types'
import type { Pinia } from 'pinia'

export function useAuthInit() {
  const nuxtApp = useNuxtApp()
  const pinia = nuxtApp.$pinia as Pinia

  async function init(user: User, account: Account | null) {
    const userStore = useUserStore(pinia)
    const accountStore = useAccountStore(pinia)
    const notificationsStore = useNotificationsStore(pinia)
    const sessionsStore = useSessionsStore(pinia)
    const achievementsStore = useAchievementsStore(pinia)
    const referralStore = useReferralStore(pinia)

    userStore.setUser(user)
    accountStore.setAccount(account ?? null)

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
    const userStore = useUserStore(pinia)
    const accountStore = useAccountStore(pinia)
    const notificationsStore = useNotificationsStore(pinia)
    const sessionsStore = useSessionsStore(pinia)
    const achievementsStore = useAchievementsStore(pinia)
    const referralStore = useReferralStore(pinia)

    userStore.logout()
    accountStore.clear()
    notificationsStore.reset()
    sessionsStore.clear()
    achievementsStore.clear()
    referralStore.clear()
  }

  async function refresh() {
    const userStore = useUserStore(pinia)
    const notificationsStore = useNotificationsStore(pinia)
    const sessionsStore = useSessionsStore(pinia)
    const achievementsStore = useAchievementsStore(pinia)
    const referralStore = useReferralStore(pinia)

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
