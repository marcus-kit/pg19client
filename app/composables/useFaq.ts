import type { FaqItem } from '~/server/api/support/faq.get'
import type { ComputedRef, Ref } from 'vue'
import type { AsyncDataRequestStatus, NuxtError } from '#app'

interface FetchFaqResult {
  faq: ComputedRef<FaqItem[]>
  error: Ref<NuxtError | null>
  pending: Ref<boolean>
  refresh: () => Promise<void>
}

interface UseFaqReturn {
  fetchFaq: () => Promise<FetchFaqResult>
}

export function useFaq(): UseFaqReturn {
  /**
   * Получить FAQ
   */
  async function fetchFaq(): Promise<FetchFaqResult> {
    const { data, error, pending, refresh } = await useFetch<{ faq: FaqItem[] }>(
      '/api/support/faq',
      {
        key: 'faq-list'
      }
    )

    return {
      faq: computed(() => data.value?.faq || []),
      error: error as Ref<NuxtError | null>,
      pending,
      refresh: refresh as () => Promise<void>
    }
  }

  return {
    fetchFaq
  }
}
