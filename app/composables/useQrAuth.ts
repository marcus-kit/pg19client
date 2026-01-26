/**
 * Composable для авторизации через QR-код
 * Пользователь видит QR на веб-сайте, сканирует в TG App и подтверждает вход
 *
 * Статусы: idle → waiting → scanned → confirmed → verified
 */

interface QrResponse {
  token: string
  qrUrl: string
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

export type QrAuthStatus = 'idle' | 'waiting' | 'scanned' | 'confirmed' | 'verified' | 'expired'

export function useQrAuth() {
  const supabase = useSupabaseClient()

  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const status = ref<QrAuthStatus>('idle')
  const qrUrl = ref<string | null>(null)
  const token = ref<string | null>(null)
  const remainingSeconds = ref(0)
  const verifiedData = ref<CompleteResponse | null>(null)

  let channel: ReturnType<typeof supabase.channel> | null = null
  let countdownInterval: ReturnType<typeof setInterval> | null = null
  let pollInterval: ReturnType<typeof setInterval> | null = null

  /**
   * Запрос на авторизацию — создаёт токен и возвращает QR URL
   */
  async function requestAuth(): Promise<QrResponse> {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<QrResponse>('/api/auth/qr/request', {
        method: 'POST'
      })

      token.value = response.token
      qrUrl.value = response.qrUrl
      remainingSeconds.value = response.expiresInSeconds
      status.value = 'waiting'

      // Подписываемся на Realtime канал + запускаем polling как fallback
      subscribeToChannel(response.token)
      startPolling(response.token)
      startCountdown()

      return response
    } catch (e: any) {
      error.value = e.data?.message || 'Ошибка создания QR-кода'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Подписка на Realtime канал для получения событий scanned/confirmed
   */
  function subscribeToChannel(authToken: string): void {
    console.log('[QrAuth] Subscribing to channel:', `qr-auth:${authToken}`)

    channel = supabase
      .channel(`qr-auth:${authToken}`)
      .on('broadcast', { event: 'scanned' }, (payload) => {
        console.log('[QrAuth] Received scanned event:', payload)
        status.value = 'scanned'
      })
      .on('broadcast', { event: 'confirmed' }, async (payload) => {
        console.log('[QrAuth] Received confirmed event:', payload)
        status.value = 'confirmed'
        stopAll()

        // Завершаем авторизацию — получаем данные пользователя и создаём сессию
        const result = await completeAuth()

        // Устанавливаем статус ПОСЛЕ загрузки данных
        if (result) {
          status.value = 'verified'
        }
      })
      .subscribe((subscribeStatus) => {
        console.log('[QrAuth] Channel status:', subscribeStatus)
      })
  }

  /**
   * Fallback polling — проверяет статус каждые 3 секунды
   */
  function startPolling(authToken: string): void {
    if (pollInterval) return

    console.log('[QrAuth] Starting polling fallback')

    pollInterval = setInterval(async () => {
      // Останавливаем polling если статус финальный
      if (status.value === 'verified' || status.value === 'expired' || status.value === 'idle') {
        stopPolling()
        return
      }

      try {
        const response = await $fetch<{ status: string }>(`/api/auth/qr/status/${authToken}`)

        if (response.status === 'scanned' && status.value === 'waiting') {
          console.log('[QrAuth] Poll detected scan!')
          status.value = 'scanned'
        } else if (response.status === 'confirmed' && status.value !== 'confirmed' && status.value !== 'verified') {
          console.log('[QrAuth] Poll detected confirmation!')
          status.value = 'confirmed'
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
        console.log('[QrAuth] Poll error:', e)
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
      const response = await $fetch<CompleteResponse>(`/api/auth/qr/complete/${token.value}`)
      verifiedData.value = response
      return response
    } catch (e: any) {
      console.error('[QrAuth] Complete error:', e)
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
      console.log('[QrAuth] Removing channel')
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
    qrUrl.value = null
    error.value = null
    remainingSeconds.value = 0
    verifiedData.value = null
  }

  // Очистка при размонтировании компонента
  onUnmounted(() => stopAll())

  return {
    // State (readonly)
    isLoading: readonly(isLoading),
    error: readonly(error),
    status: readonly(status),
    qrUrl: readonly(qrUrl),
    token: readonly(token),
    remainingSeconds: readonly(remainingSeconds),
    verifiedData: readonly(verifiedData),

    // Actions
    requestAuth,
    reset
  }
}
