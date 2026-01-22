/**
 * Composable для работы с подсказками адресов DaData
 */

export interface DadataSuggestion {
  value: string
  unrestricted_value: string
  title: string
  subtitle: string
  coordinates: [number, number] | null
  region?: string
  city?: string
  street?: string
  house?: string
  flat?: string
  postal_code?: string
  fias_id?: string
  fias_level?: string
}

export function useDadataSuggest() {
  const suggestions = ref<DadataSuggestion[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  onScopeDispose(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  })

  /**
   * Получить подсказки адресов с debounce
   */
  async function getSuggestions(query: string, debounceMs: number = 300): Promise<void> {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    if (!query || query.trim().length < 2) {
      suggestions.value = []
      return
    }

    return new Promise<void>((resolve) => {
      debounceTimer = setTimeout(async () => {
        isLoading.value = true
        error.value = null

        try {
          const response = await $fetch<{ suggestions: DadataSuggestion[] }>('/api/address/suggest', {
            method: 'POST',
            body: { query: query.trim(), count: 10 }
          })
          suggestions.value = response.suggestions || []
        } catch (e: unknown) {
          const err = e as { data?: { message?: string }; message?: string }
          console.error('DaData suggest error:', e)
          error.value = err.data?.message || err.message || 'Ошибка при загрузке подсказок'
          suggestions.value = []
        } finally {
          isLoading.value = false
          resolve()
        }
      }, debounceMs)
    })
  }

  function clearSuggestions(): void {
    suggestions.value = []
    error.value = null
  }

  return {
    suggestions: readonly(suggestions),
    isLoading: readonly(isLoading),
    error: readonly(error),
    getSuggestions,
    clearSuggestions
  }
}
