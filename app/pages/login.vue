<script setup lang="ts">
/**
 * Страница авторизации — три метода входа:
 * 1. Telegram — через виджет Telegram Login
 * 2. Договор — по номеру договора + ФИО
 * 3. Звонок — верификация по входящему звонку (IMask для телефона)
 */
import { useTelegramLogin, type TelegramUser } from '~/composables/useTelegramLogin'
import { useCallVerification } from '~/composables/useCallVerification'
import IMask from 'imask'

definePageMeta({
  layout: 'guest'
})

const { init: authInit } = useAuthInit()
const { initWidget, loginWithTelegram, isLoading: telegramLoading, error: telegramError, cleanup } = useTelegramLogin()

// -----------------------------------------------------------------------------
// Call verification (Realtime-based)
// -----------------------------------------------------------------------------
const {
  isLoading: callLoading,
  error: callError,
  status: callStatus,
  callNumber,
  remainingSeconds,
  verifiedData,
  requestVerification,
  reset: resetCall
} = useCallVerification()

// Телефон с маской IMask
const callPhone = ref('')
const phoneInputRef = ref<HTMLInputElement | null>(null)
let phoneMask: ReturnType<typeof IMask> | null = null

// Валидация телефона: 11 цифр, начинается с 7
const callPhoneValid = computed(() => {
  const digits = callPhone.value.replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('7')
})

// Метод авторизации: 'telegram' | 'contract' | 'call'
const authMethod = ref<'telegram' | 'contract' | 'call'>('telegram')

// Форма для авторизации по договору
const form = reactive({
  contractNumber: '',
  lastName: '',
  firstName: ''
})

const isLoading = ref(false)
const error = ref('')

// Переключение метода авторизации
function setAuthMethod(method: 'telegram' | 'contract' | 'call'): void {
  authMethod.value = method
  error.value = ''
  // Сбрасываем состояние call verification при переключении
  if (method !== 'call') {
    resetCall()
  }
  // Сбрасываем флаг виджета при уходе с telegram
  if (method !== 'telegram') {
    widgetInitialized.value = false
  }
}

// Обработка авторизации по звонку
async function startCallVerification(): Promise<void> {
  if (!callPhoneValid.value) return
  error.value = ''
  await requestVerification(callPhone.value)
}

// Watch для автоматического входа при verified + переинициализация маски при сбросе
watch(callStatus, async (newStatus) => {
  if (newStatus === 'verified' && verifiedData.value?.user && verifiedData.value?.account) {
    await authInit(verifiedData.value.user, verifiedData.value.account)
    await nextTick()
    await navigateTo('/dashboard')
  }

  // При сбросе на idle — уничтожаем маску (новый инпут будет создан)
  if (newStatus === 'idle') {
    phoneMask?.destroy()
    phoneMask = null
    // Ждём рендер нового инпута и инициализируем маску
    await nextTick()
    setTimeout(() => initPhoneMask(), 50)
  }
})

// Синхронизация маски при внешнем изменении (сброс формы)
watch(callPhone, (newValue) => {
  if (phoneMask && phoneMask.unmaskedValue !== newValue) {
    phoneMask.unmaskedValue = newValue || ''
  }
})

// Флаг инициализации виджета (защита от повторной инициализации)
const widgetInitialized = ref(false)

// Инициализация Telegram виджета
function initTelegramWidget(): void {
  if (widgetInitialized.value) return
  const container = document.getElementById('telegram-login-container')
  if (!container) return

  widgetInitialized.value = true
  initWidget('telegram-login-container', handleTelegramAuth)
}

// Инициализация маски телефона (вызывается когда инпут появляется в DOM)
function initPhoneMask(): void {
  if (phoneMask || !phoneInputRef.value) return

  phoneMask = IMask(phoneInputRef.value, {
    mask: '+{7} (000) 000-00-00',
    lazy: false,
    placeholderChar: '_'
  })
  phoneMask.on('accept', () => {
    callPhone.value = phoneMask!.unmaskedValue
  })
}

onMounted(() => {
  // Telegram: даём время на рендер DOM
  setTimeout(() => {
    if (authMethod.value === 'telegram') {
      initTelegramWidget()
    }
  }, 100)
})

// При переключении метода авторизации
watch(authMethod, async (method) => {
  if (method === 'telegram') {
    setTimeout(() => initTelegramWidget(), 100)
  } else if (method === 'call') {
    // Ждём рендер DOM, затем инициализируем маску
    await nextTick()
    setTimeout(() => initPhoneMask(), 50)
  }
})

// Очистка контейнера Telegram виджета (важно перед навигацией!)
function clearTelegramContainer(): void {
  const container = document.getElementById('telegram-login-container')
  if (container) {
    container.innerHTML = ''
  }
  widgetInitialized.value = false
}

onUnmounted(() => {
  clearTelegramContainer()
  cleanup()
  phoneMask?.destroy()
})

// Обработка авторизации через Telegram
async function handleTelegramAuth(telegramUser: TelegramUser): Promise<void> {
  error.value = ''

  try {
    const response = await loginWithTelegram(telegramUser)

    // Проверяем наличие данных
    if (!response?.user || !response?.account) {
      throw new Error('Telegram не привязан к аккаунту')
    }

    // Сохраняем данные в store
    await authInit(response.user, response.account)

    // Используем полный редирект вместо SPA-навигации
    // Это обходит проблему конфликта Vue unmount с Telegram виджетом
    window.location.href = '/dashboard'
  } catch (e: any) {
    error.value = e.message || 'Ошибка авторизации через Telegram'
  }
}

// Обработка авторизации по договору
async function handleContractSubmit(): Promise<void> {
  error.value = ''

  if (!form.contractNumber || !form.lastName || !form.firstName) {
    error.value = 'Заполните все поля'
    return
  }

  isLoading.value = true

  try {
    const response = await $fetch<{
      success: boolean
      user: any
      account: any
    }>('/api/auth/contract', {
      method: 'POST',
      body: {
        contractNumber: form.contractNumber,
        lastName: form.lastName,
        firstName: form.firstName
      }
    })

    // Сохраняем данные в store
    await authInit(response.user, response.account)

    // Даём Vue завершить обновление перед навигацией
    await nextTick()

    // Переходим в ЛК
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Ошибка авторизации'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <UiCard padding="lg">
      <!-- Header -->
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-[var(--text-primary)] mb-2">Вход в личный кабинет</h1>
        <p class="text-[var(--text-muted)]">Выберите способ входа</p>
      </div>

      <!-- Tabs -->
      <div class="flex mb-6 p-1 rounded-lg" style="background: var(--glass-bg);">
        <button
          @click="setAuthMethod('telegram')"
          class="flex-1 py-2 px-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5"
          :class="authMethod === 'telegram'
            ? 'bg-[#0088cc] text-white shadow-md'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
        >
          <Icon name="simple-icons:telegram" class="w-4 h-4" />
          Telegram
        </button>
        <button
          @click="setAuthMethod('contract')"
          class="flex-1 py-2 px-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5"
          :class="authMethod === 'contract'
            ? 'bg-primary text-white shadow-md'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
        >
          <Icon name="heroicons:document-text" class="w-4 h-4" />
          Договор
        </button>
        <button
          @click="setAuthMethod('call')"
          class="flex-1 py-2 px-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5"
          :class="authMethod === 'call'
            ? 'bg-accent text-white shadow-md'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
        >
          <Icon name="heroicons:phone" class="w-4 h-4" />
          Звонок
        </button>
      </div>

      <!-- Telegram Login -->
      <div v-if="authMethod === 'telegram'" class="space-y-4">
        <p class="text-sm text-[var(--text-muted)] text-center">
          Нажмите кнопку ниже для входа через Telegram
        </p>

        <!-- Telegram Widget Container (чистый div без Vue-контента, чтобы не конфликтовать с виджетом) -->
        <div id="telegram-login-container" class="flex justify-center min-h-[48px]"></div>

        <!-- Loading state (вне контейнера виджета) -->
        <div v-if="telegramLoading" class="flex items-center justify-center gap-2 text-[var(--text-muted)]">
          <Icon name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
          Авторизация...
        </div>

        <!-- Info -->
        <div class="p-3 rounded-lg text-sm" style="background: var(--glass-bg);">
          <p class="text-[var(--text-muted)]">
            <Icon name="heroicons:information-circle" class="w-4 h-4 inline mr-1" />
            Если ваш Telegram не привязан к аккаунту, войдите по номеру договора и привяжите его в профиле.
          </p>
        </div>
      </div>

      <!-- Contract Login Form -->
      <form v-else-if="authMethod === 'contract'" @submit.prevent="handleContractSubmit" class="space-y-5">
        <UiInput
          v-model="form.contractNumber"
          type="text"
          label="Номер договора"
          placeholder="12345"
          inputmode="numeric"
        />

        <UiInput
          v-model="form.lastName"
          type="text"
          label="Фамилия"
          placeholder="Иванов"
        />

        <UiInput
          v-model="form.firstName"
          type="text"
          label="Имя"
          placeholder="Иван"
        />

        <!-- Submit -->
        <UiButton type="submit" variant="primary" block :loading="isLoading">
          Войти
        </UiButton>
      </form>

      <!-- Call Verification -->
      <div v-else-if="authMethod === 'call'" class="space-y-4">
        <!-- Шаг 1: Ввод телефона -->
        <template v-if="callStatus === 'idle'">
          <p class="text-sm text-[var(--text-muted)] text-center">
            Введите номер телефона из договора
          </p>

          <!-- Поле телефона с маской IMask -->
          <div class="w-full">
            <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Номер телефона <span class="text-primary">*</span>
            </label>
            <input
              ref="phoneInputRef"
              type="tel"
              required
              class="w-full px-4 py-4 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 border-[var(--glass-border)]"
              style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
              placeholder="+7 (___) ___-__-__"
            />
            <p v-if="callPhone && !callPhoneValid" class="mt-1.5 text-sm text-red-400">
              Введите корректный номер телефона
            </p>
          </div>

          <UiButton
            variant="primary"
            block
            :loading="callLoading"
            :disabled="!callPhoneValid"
            @click="startCallVerification"
          >
            Получить номер для звонка
          </UiButton>

          <div class="p-3 rounded-lg text-sm" style="background: var(--glass-bg);">
            <p class="text-[var(--text-muted)]">
              <Icon name="heroicons:information-circle" class="w-4 h-4 inline mr-1" />
              Мы покажем номер, на который нужно позвонить. Звонок бесплатный.
            </p>
          </div>
        </template>

        <!-- Шаг 2: Ожидание звонка -->
        <template v-else-if="callStatus === 'waiting'">
          <div class="text-center">
            <p class="text-[var(--text-muted)] mb-2">Позвоните на номер:</p>
            <a
              :href="`tel:${callNumber?.replace(/\D/g, '')}`"
              class="block text-2xl font-bold text-primary mb-4 hover:text-primary/80 transition-colors"
            >
              {{ callNumber }}
            </a>
            <p class="text-sm text-[var(--text-muted)] mb-6">
              Звонок бесплатный. Ожидаем ваш звонок...
            </p>

            <!-- Таймер -->
            <div class="flex items-center justify-center gap-2 text-[var(--text-muted)] mb-6">
              <Icon name="heroicons:clock" class="w-5 h-5" />
              <span class="font-mono">{{ Math.floor(remainingSeconds / 60) }}:{{ String(remainingSeconds % 60).padStart(2, '0') }}</span>
            </div>

            <!-- Анимация -->
            <div class="relative w-20 h-20 mx-auto mb-6">
              <div class="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div class="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              <Icon name="heroicons:phone" class="absolute inset-0 m-auto w-8 h-8 text-primary" />
            </div>

            <button
              @click="resetCall"
              class="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Отмена
            </button>
          </div>
        </template>

        <!-- Шаг 3: Успех -->
        <template v-else-if="callStatus === 'verified'">
          <div class="text-center py-4">
            <Icon name="heroicons:check-circle" class="w-16 h-16 text-accent mx-auto mb-4" />
            <p class="text-lg font-medium text-[var(--text-primary)]">Номер подтверждён!</p>
            <p class="text-sm text-[var(--text-muted)]">Перенаправляем в личный кабинет...</p>
          </div>
        </template>

        <!-- Шаг 4: Истекло -->
        <template v-else-if="callStatus === 'expired'">
          <div class="text-center py-4">
            <Icon name="heroicons:x-circle" class="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p class="text-lg font-medium text-[var(--text-primary)] mb-4">Время истекло</p>
            <UiButton variant="primary" @click="resetCall">
              Попробовать снова
            </UiButton>
          </div>
        </template>
      </div>

      <!-- Error -->
      <p v-if="error || telegramError || callError" class="mt-4 text-sm text-red-400 text-center">
        {{ error || telegramError || callError }}
      </p>

      <!-- Footer -->
      <div class="mt-6 pt-6 text-center" style="border-top: 1px solid var(--glass-border);">
        <a href="https://pg19.doka.team" class="text-sm text-[var(--text-muted)] hover:text-primary transition-colors">
          Вернуться на главную
        </a>
      </div>
    </UiCard>
  </div>
</template>
