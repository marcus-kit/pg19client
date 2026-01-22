/**
 * Composable для авторизации через Telegram Deeplink
 * Использует Supabase Realtime + polling fallback (аналогично useCallVerification)
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
  const supabase = useSupabaseClient()
  const config = useRuntimeConfig()

  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const status = ref<'idle' | 'waiting' | 'verified' | 'expired'>('idle')
  const deeplink = ref<string | null>(null)
  const token = ref<string | null>(null)
  const remainingSeconds = ref(0)
  const verifiedData = ref<CompleteResponse | null>(null)

  let channel: ReturnType<typeof supabase.channel> | null = null
  let countdownInterval: ReturnType<typeof setInterval> | null = null
  let pollInterval: ReturnType<typeof setInterval> | null = null

  /**
   * Запрос на авторизацию — создаёт токен и возвращает deeplink
   * @param purpose 'login' — для входа, 'link' — для привязки к существующему аккаунту
   * @param userId Обязателен для purpose='link'
   */
  async function requestAuth(
    purpose: 'login' | 'link',
    userId?: string
  ): Promise<DeeplinkResponse> {
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

      // Подписываемся на Realtime канал + запускаем polling как fallback
      subscribeToChannel(response.token)
      startPolling(response.token)
      startCountdown()

      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Ошибка создания запроса'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Подписка на Realtime канал для получения события verified
   */
  function subscribeToChannel(authToken: string): void {
    console.log('[TelegramDeeplink] Subscribing to channel:', `telegram-auth:${authToken}`)

    channel = supabase
      .channel(`telegram-auth:${authToken}`)
      .on('broadcast', { event: 'verified' }, async (payload) => {
        console.log('[TelegramDeeplink] Received verified event:', payload)
        stopAll()

        // Завершаем авторизацию — получаем данные пользователя и создаём сессию
        const result = await completeAuth()

        // Устанавливаем статус ПОСЛЕ загрузки данных
        if (result) {
          status.value = 'verified'
        }
      })
      .subscribe((subscribeStatus) => {
        console.log('[TelegramDeeplink] Channel status:', subscribeStatus)
      })
  }

  /**
   * Fallback polling — проверяет статус каждые 3 секунды
   */
  function startPolling(authToken: string): void {
    if (pollInterval) return

    console.log('[TelegramDeeplink] Starting polling fallback')

    pollInterval = setInterval(async () => {
      if (status.value !== 'waiting') {
        stopPolling()
        return
      }

      try {
        const response = await $fetch<{ status: string }>(`/api/auth/telegram-deeplink/status/${authToken}`)

        if (response.status === 'verified') {
          console.log('[TelegramDeeplink] Poll detected verification!')
          stopAll()

          const result = await completeAuth()
          if (result) {
            status.value = 'verified'
          }
        } else if (response.status === 'expired') {
          stopAll()
          status.value = 'expired'
        }
      } catch (e) {
        console.log('[TelegramDeeplink] Poll error:', e)
      }
    }, 3000)
  }

  function stopPolling(): void {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  /**
   * Завершение авторизации — получение данных и создание сессии
   */
  async function completeAuth(): Promise<CompleteResponse | null> {
    if (!token.value) return null

    try {
      const response = await $fetch<CompleteResponse>(`/api/auth/telegram-deeplink/complete/${token.value}`)
      verifiedData.value = response
      return response
    } catch (e: any) {
      console.error('[TelegramDeeplink] Complete error:', e)
      error.value = e.data?.message || 'Ошибка завершения авторизации'
      return null
    }
  }

  /**
   * Запуск обратного отсчёта
   */
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

  /**
   * Остановка всех подписок и интервалов
   */
  function stopAll(): void {
    if (channel) {
      console.log('[TelegramDeeplink] Removing channel')
      supabase.removeChannel(channel)
      channel = null
    }
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
    stopPolling()
  }

  /**
   * Сброс состояния для повторной попытки
   */
  function reset(): void {
    stopAll()
    status.value = 'idle'
    token.value = null
    deeplink.value = null
    error.value = null
    remainingSeconds.value = 0
    verifiedData.value = null
  }

  /**
   * Получить username бота для отображения
   */
  const botUsername = computed(() => config.public.telegramBotUsername || 'PG19CONNECTBOT')

  // Очистка при размонтировании компонента
  onUnmounted(() => stopAll())

  return {
    // State (readonly)
    isLoading: readonly(isLoading),
    error: readonly(error),
    status: readonly(status),
    deeplink: readonly(deeplink),
    token: readonly(token),
    remainingSeconds: readonly(remainingSeconds),
    verifiedData: readonly(verifiedData),
    botUsername,

    // Actions
    requestAuth,
    reset
  }
}
