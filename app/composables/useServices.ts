/**
 * useServices — работа с каталогом услуг
 *
 * Методы:
 * - fetchServices — список доступных услуг
 * - fetchSubscriptions — подключенные услуги пользователя
 */
import type { Service, Subscription } from '~/types/service'

export function useServices() {
  // Получить список доступных услуг
  async function fetchServices() {
    const { data, error, pending, refresh } = await useFetch<{ services: Service[] }>(
      '/api/services',
      {
        key: 'services-list'
      }
    )

    return {
      services: computed(() => data.value?.services || []),
      error,
      pending,
      refresh
    }
  }

  // Получить подписки (подключенные услуги) пользователя
  async function fetchSubscriptions() {
    const { data, error, pending, refresh } = await useFetch<{ subscriptions: Subscription[] }>(
      '/api/account/subscriptions',
      {
        key: 'account-subscriptions'
      }
    )

    return {
      subscriptions: computed(() => data.value?.subscriptions || []),
      error,
      pending,
      refresh
    }
  }

  return {
    fetchServices,
    fetchSubscriptions
  }
}
