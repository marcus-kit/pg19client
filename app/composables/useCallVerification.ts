/**
 * Composable для авторизации по входящему звонку.
 * Использует polling статуса (без Supabase Realtime).
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
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const status = ref<'idle' | 'waiting' | 'verified' | 'expired'>('idle')
  const callNumber = ref<string | null>(null)
  const token = ref<string | null>(null)
  const remainingSeconds = ref(0)
  const verifiedData = ref<CompleteResponse | null>(null)

  let countdownInterval: ReturnType<typeof setInterval> | null = null
  let pollInterval: ReturnType<typeof setInterval> | null = null

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

      startPolling(response.token)
      startCountdown()

      return response
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      error.value = err.data?.message || 'Ошибка отправки запроса'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const startPolling = (verifyToken: string) => {
    if (pollInterval) return

    pollInterval = setInterval(async () => {
      if (status.value !== 'waiting') {
        stopPolling()
        return
      }

      try {
        const response = await $fetch<{ status: string }>(`/api/auth/call-verify/status/${verifyToken}`)

        if (response.status === 'verified') {
          stopAll()

          const result = await completeVerification()
          if (result) {
            status.value = 'verified'
          }
        } else if (response.status === 'expired') {
          stopAll()
          status.value = 'expired'
        }
      } catch {
        // ignore
      }
    }, 3000)
  }

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

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

  const stopAll = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
    stopPolling()
  }

  const reset = () => {
    stopAll()
    status.value = 'idle'
    token.value = null
    callNumber.value = null
    error.value = null
    remainingSeconds.value = 0
    verifiedData.value = null
  }

  onUnmounted(() => stopAll())

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    status: readonly(status),
    callNumber: readonly(callNumber),
    token: readonly(token),
    remainingSeconds: readonly(remainingSeconds),
    verifiedData: readonly(verifiedData),

    requestVerification,
    completeVerification,
    reset
  }
}
