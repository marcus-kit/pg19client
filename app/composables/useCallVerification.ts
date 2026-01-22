/**
 * Composable для авторизации по входящему звонку
 * Использует Supabase Realtime вместо polling
 */

interface CallVerifyResponse {
  token: string
  callNumber: string
  expiresAt: string
  expiresInSeconds: number
}

interface CompleteResponse {
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

export function useCallVerification() {
  const supabase = useSupabaseClient()

  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const status = ref<'idle' | 'waiting' | 'verified' | 'expired'>('idle')
  const callNumber = ref<string | null>(null)
  const token = ref<string | null>(null)
  const remainingSeconds = ref(0)
  const verifiedData = ref<CompleteResponse | null>(null)

  let channel: ReturnType<typeof supabase.channel> | null = null
  let countdownInterval: ReturnType<typeof setInterval> | null = null
  let pollInterval: ReturnType<typeof setInterval> | null = null

  /**
   * Запрос на верификацию — создаёт токен и возвращает номер для звонка
   */
  const requestVerification = async (phone: string): Promise<CallVerifyResponse> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<CallVerifyResponse>('/api/auth/call-verify/request', {
        method: 'POST',
        body: { phone }
      })

      token.value = response.token
      callNumber.value = response.callNumber
      remainingSeconds.value = response.expiresInSeconds
      status.value = 'waiting'

      // Подписываемся на Realtime канал + запускаем polling как fallback
      subscribeToChannel(response.token)
      startPolling(response.token)
      startCountdown()

      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Ошибка отправки запроса'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Подписка на Realtime канал для получения события verified
   */
  const subscribeToChannel = (verifyToken: string) => {
    console.log('[CallVerify] Subscribing to channel:', `call-verify:${verifyToken}`)

    channel = supabase
      .channel(`call-verify:${verifyToken}`)
      .on('broadcast', { event: 'verified' }, async (payload) => {
        console.log('[CallVerify] Received verified event:', payload)
        stopAll()

        // Завершаем авторизацию — получаем данные пользователя и создаём сессию
        const result = await completeVerification()

        // Устанавливаем статус ПОСЛЕ загрузки данных, чтобы watch сработал корректно
        if (result) {
          status.value = 'verified'
        }
      })
      .subscribe((subscribeStatus) => {
        console.log('[CallVerify] Channel status:', subscribeStatus)
      })
  }

  /**
   * Fallback polling - проверяет статус верификации каждые 3 секунды
   */
  const startPolling = (verifyToken: string) => {
    if (pollInterval) return

    console.log('[CallVerify] Starting polling fallback')

    pollInterval = setInterval(async () => {
      if (status.value !== 'waiting') {
        stopPolling()
        return
      }

      try {
        const response = await $fetch<{ status: string }>(`/api/auth/call-verify/status/${verifyToken}`)

        if (response.status === 'verified') {
          console.log('[CallVerify] Poll detected verification!')
          stopAll()

          const result = await completeVerification()
          if (result) {
            status.value = 'verified'
          }
        }
      } catch (e) {
        // Игнорируем ошибки polling
        console.log('[CallVerify] Poll error:', e)
      }
    }, 3000)
  }

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  /**
   * Завершение авторизации — получение данных пользователя и создание сессии
   */
  const completeVerification = async (): Promise<CompleteResponse | null> => {
    if (!token.value) return null

    try {
      const response = await $fetch<CompleteResponse>(`/api/auth/call-verify/complete/${token.value}`)
      verifiedData.value = response
      return response
    } catch (e) {
      console.error('[CallVerify] Complete error:', e)
      error.value = 'Ошибка завершения авторизации'
      return null
    }
  }

  /**
   * Запуск обратного отсчёта
   */
  const startCountdown = () => {
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
  const stopAll = () => {
    if (channel) {
      console.log('[CallVerify] Removing channel')
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
  const reset = () => {
    stopAll()
    status.value = 'idle'
    token.value = null
    callNumber.value = null
    error.value = null
    remainingSeconds.value = 0
    verifiedData.value = null
  }

  // Очистка при размонтировании компонента
  onUnmounted(() => stopAll())

  return {
    // State (readonly для безопасности)
    isLoading: readonly(isLoading),
    error: readonly(error),
    status: readonly(status),
    callNumber: readonly(callNumber),
    token: readonly(token),
    remainingSeconds: readonly(remainingSeconds),
    verifiedData: readonly(verifiedData),

    // Actions
    requestVerification,
    completeVerification,
    reset
  }
}
