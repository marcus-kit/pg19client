/**
 * Composable для авторизации через Telegram Deeplink.
 * Использует polling статуса (без Supabase Realtime).
 */

interface DeeplinkResponse {
  token: string
  deeplink: string
  expiresAt: string
  expiresInSeconds: number
}

interface LoginCompleteResponse {
  success: boolean
  user: {
    id: string
    firstName: string
    lastName: string
    middleName?: string
    phone: string
    email: string
    telegram: string
    telegramId: string | null
    vkId: string
    avatar: string | null
    birthDate: string | null
    role: string
  }
  account: {
    contractNumber: number
    balance: number
    status: string
    tariff: string
    address: string
    startDate: string
  }
}

interface LinkCompleteResponse {
  success: boolean
  telegramId: string
  telegramUsername: string | null
}

type CompleteResponse = LoginCompleteResponse | LinkCompleteResponse

export function useTelegramDeeplink() {
  const config = useRuntimeConfig()

  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const status = ref<'idle' | 'waiting' | 'verified' | 'expired'>('idle')
  const deeplink = ref<string | null>(null)
  const token = ref<string | null>(null)
  const remainingSeconds = ref(0)
  const verifiedData = ref<CompleteResponse | null>(null)

  let countdownInterval: ReturnType<typeof setInterval> | null = null
  let pollInterval: ReturnType<typeof setInterval> | null = null

  async function requestAuth(
    purpose: 'login' | 'link',
    userId?: string
  ): Promise<DeeplinkResponse> {
    stopAll()
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<DeeplinkResponse>('/api/auth/telegram-deeplink/request', {
        method: 'POST',
        body: {
          purpose,
          userId
        }
      })

      token.value = response.token
      deeplink.value = response.deeplink
      remainingSeconds.value = response.expiresInSeconds
      status.value = 'waiting'

      startPolling(response.token)
      startCountdown()

      if (import.meta.client && response.deeplink) {
        window.open(response.deeplink, '_blank', 'noopener,noreferrer')
      }

      return response
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      error.value = err.data?.message || 'Ошибка создания запроса'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  function startPolling(authToken: string): void {
    if (pollInterval) return

    pollInterval = setInterval(async () => {
      if (status.value !== 'waiting') {
        stopPolling()
        return
      }

      try {
        const response = await $fetch<{ status: string }>(`/api/auth/telegram-deeplink/status/${authToken}`)

        if (response.status === 'verified') {
          stopAll()

          const result = await completeAuth()
          if (result) {
            status.value = 'verified'
          }
        } else if (response.status === 'expired') {
          stopAll()
          status.value = 'expired'
        }
      } catch {
        // ignore poll errors
      }
    }, 3000)
  }

  function stopPolling(): void {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  async function completeAuth(): Promise<CompleteResponse | null> {
    if (!token.value) return null

    try {
      const response = await $fetch<CompleteResponse>(`/api/auth/telegram-deeplink/complete/${token.value}`)
      verifiedData.value = response
      return response
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      console.error('[TelegramDeeplink] Complete error:', e)
      error.value = err.data?.message || 'Ошибка завершения авторизации'
      return null
    }
  }

  function startCountdown(): void {
    if (countdownInterval) return

    countdownInterval = setInterval(() => {
      if (remainingSeconds.value > 0) {
        remainingSeconds.value--
      } else {
        status.value = 'expired'
        stopAll()
      }
    }, 1000)
  }

  function stopAll(): void {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
    stopPolling()
  }

  function reset(): void {
    stopAll()
    status.value = 'idle'
    token.value = null
    deeplink.value = null
    error.value = null
    remainingSeconds.value = 0
    verifiedData.value = null
  }

  const botUsername = computed(() => config.public.telegramBotUsername || 'PG19CONNECTBOT')

  onUnmounted(() => stopAll())

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    status: readonly(status),
    deeplink: readonly(deeplink),
    token: readonly(token),
    remainingSeconds: readonly(remainingSeconds),
    verifiedData: readonly(verifiedData),
    botUsername,

    requestAuth,
    reset
  }
}
