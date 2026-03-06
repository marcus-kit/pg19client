/**
 * Composable для авторизации и привязки Telegram через deeplink.
 * Использует SSE (Server-Sent Events) вместо HTTP-polling для мгновенного
 * обнаружения изменения статуса в БД.
 */

interface DeeplinkResponse {
  token: string
  deeplink: string
  expiresAt: string
  expiresInSeconds: number
}

interface LinkCompleteResponse {
  success: boolean
  telegramId: string
  telegramUsername: string | null
}

export interface LoginCompleteResponse {
  success: boolean
  user: {
    id: string
    firstName?: string
    lastName?: string
    middleName?: string
    phone: string
    email: string
    telegram: string
    telegramId: string
    vkId: string
    avatar: string | null
    birthDate: string | null
    role: string
  }
  account: {
    contractNumber: string
    balance: number
    status: string
    tariff: string
    address: string
    startDate: string | null
    payDay: number
  } | null
}

type Status = 'idle' | 'waiting' | 'verified' | 'expired' | 'error'

export function useTelegramDeeplink() {
  const config = useRuntimeConfig()

  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const status = ref<Status>('idle')
  const deeplink = ref<string | null>(null)
  const token = ref<string | null>(null)
  const remainingSeconds = ref(0)
  const verifiedData = ref<LinkCompleteResponse | LoginCompleteResponse | null>(null)

  let countdownInterval: ReturnType<typeof setInterval> | null = null
  let eventSource: EventSource | null = null
  let sseRetryTimer: ReturnType<typeof setTimeout> | null = null

  async function requestAuth(purpose: 'login'): Promise<DeeplinkResponse>
  async function requestAuth(purpose: 'link', userId: string): Promise<DeeplinkResponse>
  async function requestAuth(
    purpose: 'login' | 'link',
    userId?: string
  ): Promise<DeeplinkResponse> {
    stopAll()
    isLoading.value = true
    error.value = null

    try {
      const body = purpose === 'link' && userId
        ? { purpose, userId }
        : { purpose: 'login' as const }

      const response = await $fetch<DeeplinkResponse>('/api/auth/telegram-deeplink/request', {
        method: 'POST',
        body
      })

      token.value = response.token
      deeplink.value = response.deeplink
      remainingSeconds.value = response.expiresInSeconds
      status.value = 'waiting'

      startSSE(response.token)
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

  function startSSE(authToken: string): void {
    if (!import.meta.client) return
    closeSSE()

    eventSource = new EventSource(`/api/auth/telegram-deeplink/stream/${authToken}`)

    eventSource.onmessage = async (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data as string) as { status: string }

        if (data.status === 'verified') {
          closeSSE()
          stopCountdown()
          const result = await completeAuth()
          status.value = result ? 'verified' : 'error'
        } else if (data.status === 'expired' || data.status === 'used') {
          closeSSE()
          stopCountdown()
          status.value = 'expired'
        }
      } catch {
        // игнорируем ошибки парсинга heartbeat-комментариев
      }
    }

    eventSource.onerror = () => {
      closeSSE()
      // Повторное подключение через 3 сек если всё ещё ждём
      if (status.value === 'waiting' && token.value) {
        sseRetryTimer = setTimeout(() => {
          if (status.value === 'waiting' && token.value) {
            startSSE(token.value)
          }
        }, 3000)
      }
    }
  }

  function closeSSE(): void {
    if (sseRetryTimer) {
      clearTimeout(sseRetryTimer)
      sseRetryTimer = null
    }
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  }

  async function completeAuth(): Promise<LinkCompleteResponse | LoginCompleteResponse | null> {
    if (!token.value) return null

    try {
      const response = await $fetch<LinkCompleteResponse | LoginCompleteResponse>(
        `/api/auth/telegram-deeplink/complete/${token.value}`
      )
      verifiedData.value = response
      return response
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      console.error('[TelegramDeeplink] Complete error:', e)
      error.value = err.data?.message || 'Ошибка завершения'
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

  function stopCountdown(): void {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
  }

  function stopAll(): void {
    stopCountdown()
    closeSSE()
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
