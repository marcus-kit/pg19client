<script setup lang="ts">
/**
 * Страница авторизации — три метода входа:
 * 1. Telegram — через официальный Telegram Login Widget (JS callback + серверная верификация)
 * 2. Договор — по номеру договора + ФИО (синхронный API запрос)
 * 3. Звонок — верификация по входящему звонку (Realtime подписка)
 *
 * layout: false — страница без обёртки, header/footer инлайн
 */
import { useCallVerification } from '~/composables/useCallVerification'
import IMask from 'imask'

definePageMeta({
  layout: false
})

const { init: authInit } = useAuthInit()

// =============================================================================
// STORES & COMPOSABLES — подключаем логику авторизации
// =============================================================================

// Telegram Login Widget — официальный виджет, авторизация без webhook
const config = useRuntimeConfig()
const botUsername = computed(() => config.public.telegramBotUsername || 'PG19CONNECTBOT')
const tgWidgetRef = ref<HTMLDivElement | null>(null)
const telegramLoading = ref(false)
const telegramError = ref<string | null>(null)

// Call Verification — создаёт номер, слушает Realtime, подтверждает при звонке
const {
  isLoading: callLoading,
  error: callError,
  status: callStatus,             // 'idle' | 'waiting' | 'verified' | 'expired'
  callNumber,                     // Номер для звонка (8-800-xxx-xx-xx)
  remainingSeconds,
  verifiedData,
  requestVerification,
  reset: resetCall
} = useCallVerification()

// =============================================================================
// STATE — локальное состояние страницы
// =============================================================================

// Текущий метод авторизации (таб)
const authMethod = ref<'telegram' | 'contract' | 'call'>('telegram')

// Форма авторизации по договору
const form = reactive({
  contractNumber: '',
  password: ''
})

const isLoading = ref(false)  // Загрузка формы договора
const error = ref('')         // Общая ошибка (для договора)
const showPassword = ref(false) // Показать/скрыть пароль (глаз)

// Модальное окно регистрации
const showRegisterModal = ref(false)
const showFullRegisterInfo = ref(false)

// Телефон с маской IMask
const callPhone = ref('')
const phoneInputRef = ref<HTMLInputElement | null>(null)
let phoneMask: ReturnType<typeof IMask> | null = null
let phoneClickHandler: ((e: Event) => void) | null = null

// =============================================================================
// COMPUTED — вычисляемые значения
// =============================================================================

// Валидация телефона: 11 цифр, начинается с 7
const callPhoneValid = computed(() => {
  const digits = callPhone.value.replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('7')
})

// Форматирование таймеров в MM:SS
function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = String(seconds % 60).padStart(2, '0')
  return `${mins}:${secs}`
}

const callTimer = computed(() => formatTimer(remainingSeconds.value))

// =============================================================================
// METHODS — обработчики событий
// =============================================================================

// Переключение метода авторизации (сбрасывает состояние других методов)
function setAuthMethod(method: 'telegram' | 'contract' | 'call'): void {
  authMethod.value = method
  error.value = ''
  if (method !== 'call') resetCall()
  if (method === 'telegram') telegramError.value = null
}

// Только цифры (номер договора)
function sanitizeContractNumber(value: string): string {
  return value.replace(/\D/g, '')
}

// Разрешить только цифры и служебные клавиши в поле номера договора
function onContractKeydown(e: KeyboardEvent): void {
  const key = e.key
  if (key >= '0' && key <= '9') return
  if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return
  if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(key.toLowerCase())) return
  e.preventDefault()
}

// При вставке в поле договора — оставить только цифры
function onContractPaste(e: ClipboardEvent): void {
  e.preventDefault()
  const pasted = e.clipboardData?.getData('text') ?? ''
  form.contractNumber = sanitizeContractNumber(form.contractNumber + pasted)
}

// Только латиница, цифры и символы — без русских букв (печатные ASCII)
function sanitizePassword(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, '')
}

// Разрешить только печатные ASCII и служебные клавиши в поле пароля
function onPasswordKeydown(e: KeyboardEvent): void {
  const key = e.key
  if (key.length === 1) {
    const code = key.charCodeAt(0)
    if (code >= 0x20 && code <= 0x7E) return
  }
  if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return
  if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(key.toLowerCase())) return
  e.preventDefault()
}

// При вставке в поле пароля — оставить только латиницу, цифры и символы
function onPasswordPaste(e: ClipboardEvent): void {
  e.preventDefault()
  const pasted = e.clipboardData?.getData('text') ?? ''
  form.password = sanitizePassword(form.password + pasted)
}

// Запуск верификации по звонку — создаёт номер для звонка
async function startCallVerification(): Promise<void> {
  if (!callPhoneValid.value) return
  error.value = ''
  await requestVerification(callPhone.value)
}

// Обработка формы авторизации по договору
async function handleContractSubmit(): Promise<void> {
  error.value = ''

  if (!form.contractNumber?.trim() || !form.password) {
    error.value = 'Заполните номер договора и пароль'
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
        contractNumber: form.contractNumber.trim(),
        password: form.password
      }
    })

    await authInit(response.user, response.account)
    await nextTick()
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Ошибка авторизации'
  } finally {
    isLoading.value = false
  }
}

// Инициализация маски телефона (+7 формат)
function initPhoneMask(): void {
  if (phoneMask || !phoneInputRef.value) return

  phoneMask = IMask(phoneInputRef.value, {
    mask: '+{7} (000) 000-00-00',
    lazy: false,
    placeholderChar: '_',
    overwrite: true, // Перезаписывать символы вместо вставки
    autofix: true, // Автоматически исправлять неполные значения
    prepare: (appended: string, masked: any) => {
      // Защита от удаления статической части (+7)
      if (masked.value && !masked.value.startsWith('+7')) {
        return ''
      }
      return appended
    }
  })
  
  phoneMask.on('accept', () => {
    // Синхронизируем значение с реактивной переменной
    callPhone.value = phoneMask!.unmaskedValue
    
    // Дополнительная защита: восстанавливаем +7 если его случайно удалили
    if (phoneMask!.value && !phoneMask!.value.startsWith('+7')) {
      const digits = phoneMask!.unmaskedValue.replace(/\D/g, '')
      if (digits.length > 0) {
        phoneMask!.unmaskedValue = '7' + digits.replace(/^7/, '')
      } else {
        phoneMask!.value = '+7 (___) ___-__-__'
      }
    }
  })
  
  // Защита от удаления статической части при любых изменениях
  phoneMask.on('input', () => {
    if (phoneMask!.value && !phoneMask!.value.startsWith('+7')) {
      const digits = phoneMask!.unmaskedValue.replace(/\D/g, '')
      if (digits.length > 0) {
        phoneMask!.unmaskedValue = '7' + digits.replace(/^7/, '')
      } else {
        phoneMask!.value = '+7 (___) ___-__-__'
      }
    }
  })
  
  // Защита при клике: если кликнули в область +7, не даем удалить
  phoneClickHandler = (e: Event) => {
    const target = e.target as HTMLInputElement
    const selectionStart = target.selectionStart || 0
    // Если курсор в области +7 (первые 2 символа), перемещаем его после
    if (selectionStart < 2 && phoneMask!.value.startsWith('+7')) {
      setTimeout(() => {
        phoneMask!.updateCursor()
        if (target.setSelectionRange) {
          target.setSelectionRange(2, 2)
        }
      }, 0)
    }
  }
  phoneInputRef.value.addEventListener('click', phoneClickHandler)
}

// =============================================================================
// WATCHERS — реактивные наблюдатели
// =============================================================================

// Автоматический вход при успешной верификации звонка (account может быть null — пользователь без договора)
watch(callStatus, async (newStatus) => {
  if (newStatus === 'verified' && verifiedData.value?.user) {
    await authInit(verifiedData.value.user, verifiedData.value.account ?? null)
    await nextTick()
    await navigateTo('/dashboard')
  }

  // При сбросе — пересоздаём маску (инпут перемонтируется)
  if (newStatus === 'idle') {
    if (phoneClickHandler && phoneInputRef.value) {
      phoneInputRef.value.removeEventListener('click', phoneClickHandler)
      phoneClickHandler = null
    }
    phoneMask?.destroy()
    phoneMask = null
    await nextTick()
    setTimeout(() => initPhoneMask(), 50)
  }
})

// Синхронизация маски при программном изменении callPhone
watch(callPhone, (newValue) => {
  if (phoneMask && phoneMask.unmaskedValue !== newValue) {
    phoneMask.unmaskedValue = newValue || ''
  }
})

// Инициализация маски / виджета при переключении табов
watch(authMethod, async (method) => {
  if (method === 'call') {
    await nextTick()
    setTimeout(() => initPhoneMask(), 50)
  } else if (method === 'telegram') {
    // Переинициализируем виджет, так как div пересоздаётся
    await nextTick()
    setTimeout(() => initTelegramWidget(), 50)
  }

  if (method !== 'call') {
    // При переключении с таба "call" уничтожаем маску и обработчик
    if (phoneClickHandler && phoneInputRef.value) {
      phoneInputRef.value.removeEventListener('click', phoneClickHandler)
      phoneClickHandler = null
    }
    phoneMask?.destroy()
    phoneMask = null
  }
})

// =============================================================================
// TELEGRAM WIDGET
// =============================================================================

function initTelegramWidget(): void {
  if (!tgWidgetRef.value || !import.meta.client) return
  tgWidgetRef.value.innerHTML = ''
  const script = document.createElement('script')
  script.src = 'https://telegram.org/js/telegram-widget.js?22'
  script.setAttribute('data-telegram-login', botUsername.value)
  script.setAttribute('data-size', 'large')
  script.setAttribute('data-userpic', 'false')
  script.setAttribute('data-onauth', 'onTelegramAuthCallback(user)')
  script.setAttribute('data-request-access', 'write')
  script.async = true
  tgWidgetRef.value.appendChild(script)
}

// =============================================================================
// LIFECYCLE — жизненный цикл компонента
// =============================================================================

onMounted(() => {
  ;(window as any).onTelegramAuthCallback = async (user: Record<string, unknown>) => {
    telegramLoading.value = true
    telegramError.value = null
    try {
      const response = await $fetch<{ success: boolean; user: any; account: any }>(
        '/api/auth/telegram/verify',
        { method: 'POST', body: user }
      )
      await authInit(response.user, response.account)
      await nextTick()
      await navigateTo('/dashboard')
    } catch (e: any) {
      telegramError.value = e.data?.message || e.message || 'Ошибка авторизации Telegram'
    } finally {
      telegramLoading.value = false
    }
  }
  initTelegramWidget()
})

onUnmounted(() => {
  delete (window as any).onTelegramAuthCallback
  if (phoneClickHandler && phoneInputRef.value) {
    phoneInputRef.value.removeEventListener('click', phoneClickHandler)
    phoneClickHandler = null
  }
  phoneMask?.destroy()
  phoneMask = null
})
</script>

<template>
  <div class="min-h-screen mesh-gradient-hero flex flex-col">

    <!-- =====================================================================
         HEADER — логотип (ведёт на дашборд)
         ===================================================================== -->
    <header class="py-6">
      <div class="container mx-auto max-w-5xl px-4">
        <NuxtLink to="/dashboard" class="flex items-center gap-3 w-fit">
          <img src="/logo.png" alt="PG19" class="h-10" />
        </NuxtLink>
      </div>
    </header>

    <!-- =====================================================================
         CONTENT — карточка авторизации
         ===================================================================== -->
    <main class="flex-1 flex items-center justify-center px-4 py-8">
      <div class="w-full max-w-md">
        <UiCard padding="lg">

          <!-- Заголовок карточки -->
          <div class="text-center mb-6">
            <h1 class="text-2xl font-bold text-[var(--text-primary)] mb-2">Вход в личный кабинет</h1>
            <p class="text-[var(--text-muted)]">Выберите способ входа</p>
          </div>

          <!-- -----------------------------------------------------------------
               Табы — переключение метода авторизации
               ----------------------------------------------------------------- -->
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

          <!-- -----------------------------------------------------------------
               TELEGRAM — авторизация через Telegram Login Widget
               ----------------------------------------------------------------- -->
          <div v-if="authMethod === 'telegram'" class="space-y-4">

            <!-- Контейнер виджета + состояние загрузки -->
            <div class="flex flex-col items-center gap-4 py-2">
              <p class="text-sm text-[var(--text-muted)] text-center">
                Нажмите кнопку для входа через Telegram
              </p>

              <!-- Telegram Login Widget вставляется сюда в onMounted -->
              <div ref="tgWidgetRef" class="flex justify-center min-h-[52px]"></div>

              <!-- Индикатор загрузки после нажатия на виджет -->
              <div v-if="telegramLoading" class="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                <div class="w-4 h-4 border-2 border-[#0088cc] border-t-transparent rounded-full animate-spin"></div>
                Выполняем вход...
              </div>
            </div>

            <!-- Подсказка для новых пользователей -->
            <div class="p-3 rounded-lg text-sm" style="background: var(--glass-bg);">
              <p class="text-[var(--text-muted)]">
                <Icon name="heroicons:information-circle" class="w-4 h-4 inline mr-1" />
                Если ваш Telegram не привязан к аккаунту, войдите по номеру договора и привяжите его в профиле.
              </p>
            </div>
          </div>

          <!-- -----------------------------------------------------------------
               ДОГОВОР — авторизация по номеру договора и паролю
               ----------------------------------------------------------------- -->
          <form v-else-if="authMethod === 'contract'" @submit.prevent="handleContractSubmit" class="space-y-5">
            <div class="w-full">
              <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Номер договора
              </label>
              <input
                :value="form.contractNumber"
                type="text"
                inputmode="numeric"
                autocomplete="username"
                placeholder="12345"
                maxlength="20"
                class="w-full px-4 py-3 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
                @input="form.contractNumber = sanitizeContractNumber(($event.target as HTMLInputElement).value)"
                @keydown="onContractKeydown"
                @paste="onContractPaste"
              />
            </div>

            <div class="w-full">
              <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Пароль
              </label>
              <div class="relative">
                <input
                  :value="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  class="w-full px-4 py-3 pr-12 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
                  @input="form.password = sanitizePassword(($event.target as HTMLInputElement).value)"
                  @keydown="onPasswordKeydown"
                  @paste="onPasswordPaste"
                />
                <button
                  type="button"
                  :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'"
                  class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
                  @click="showPassword = !showPassword"
                >
                  <Icon :name="showPassword ? 'heroicons:eye-slash' : 'heroicons:eye'" class="w-5 h-5" />
                </button>
              </div>
            </div>

            <UiButton type="submit" variant="primary" block :loading="isLoading">
              Войти
            </UiButton>
          </form>

          <!-- -----------------------------------------------------------------
               ЗВОНОК — верификация по входящему звонку
               Состояния: idle → waiting → verified/expired
               ----------------------------------------------------------------- -->
          <div v-else-if="authMethod === 'call'" class="space-y-4">

            <!-- Шаг 1: Ввод номера телефона -->
            <template v-if="callStatus === 'idle'">
              <p class="text-sm text-[var(--text-muted)] text-center">
                Введите номер телефона из договора
              </p>

              <!-- Поле телефона с маской IMask (+7 формат) -->
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

              <!-- Подсказка о бесплатном звонке -->
              <div class="p-3 rounded-lg text-sm" style="background: var(--glass-bg);">
                <p class="text-[var(--text-muted)]">
                  <Icon name="heroicons:information-circle" class="w-4 h-4 inline mr-1" />
                  Мы покажем номер, на который нужно позвонить. Звонок бесплатный.
                </p>
              </div>
            </template>

            <!-- Шаг 2: Ожидание звонка — показываем номер для звонка -->
            <template v-else-if="callStatus === 'waiting'">
              <div class="text-center">
                <p class="text-[var(--text-muted)] mb-2">Позвоните на номер:</p>

                <!-- Кликабельный номер (tel: ссылка) -->
                <a
                  :href="`tel:${callNumber?.replace(/\D/g, '')}`"
                  class="block text-2xl font-bold text-primary mb-4 hover:text-primary/80 transition-colors"
                >
                  {{ callNumber }}
                </a>

                <p class="text-sm text-[var(--text-muted)] mb-6">
                  Звонок бесплатный. Ожидаем ваш звонок...
                </p>

                <!-- Таймер обратного отсчёта -->
                <div class="flex items-center justify-center gap-2 text-[var(--text-muted)] mb-6">
                  <Icon name="heroicons:clock" class="w-5 h-5" />
                  <span class="font-mono">{{ callTimer }}</span>
                </div>

                <!-- Анимация ожидания (спиннер) -->
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

            <!-- Шаг 3: Номер подтверждён — редирект на дашборд -->
            <template v-else-if="callStatus === 'verified'">
              <div class="text-center py-4">
                <Icon name="heroicons:check-circle" class="w-16 h-16 text-accent mx-auto mb-4" />
                <p class="text-lg font-medium text-[var(--text-primary)]">Номер подтверждён!</p>
                <p class="text-sm text-[var(--text-muted)]">Перенаправляем в личный кабинет...</p>
              </div>
            </template>

            <!-- Шаг 4: Время истекло — предложение повторить -->
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

          <!-- Общая ошибка (от любого метода авторизации) -->
          <p v-if="error || telegramError || callError" class="mt-4 text-sm text-red-400 text-center">
            {{ error || telegramError || callError }}
          </p>

          <!-- Ссылка на главную страницу сайта -->
          <div class="mt-6 pt-6 space-y-3" style="border-top: 1px solid var(--glass-border);">
            <div class="flex items-center gap-3 group">
              <div class="flex-1 h-px bg-orange-500 group-hover:bg-orange-400 transition-colors"></div>
              <button
                @click="showRegisterModal = true"
                class="text-sm text-orange-500 hover:text-orange-400 transition-colors whitespace-nowrap font-medium"
              >
                Зарегистрироваться
              </button>
              <div class="flex-1 h-px bg-orange-500 group-hover:bg-orange-400 transition-colors"></div>
            </div>
            <div class="text-center">
              <a href="https://pg19.doka.team" class="text-sm text-[var(--text-muted)] hover:text-primary transition-colors">
                Вернуться на главную
              </a>
            </div>
          </div>

        </UiCard>
      </div>
    </main>

    <!-- =====================================================================
         FOOTER — копирайт
         ===================================================================== -->
    <footer class="py-6 text-center text-gray-500 text-sm">
      <p>&copy; {{ new Date().getFullYear() }} ПЖ19. Все права защищены.</p>
    </footer>

    <!-- =====================================================================
         Register Modal — модальное окно регистрации
         ===================================================================== -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showRegisterModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style="background-color: rgba(0, 0, 0, 0.6);"
          @click.self="showRegisterModal = false; showFullRegisterInfo = false"
        >
          <div class="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden" style="background: var(--bg-surface); border: 1px solid var(--glass-border); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
            <!-- Закрыть -->
            <button
              @click="showRegisterModal = false; showFullRegisterInfo = false"
              class="absolute top-4 right-4 z-10 p-2 rounded-lg hover:bg-[var(--glass-bg)] transition-colors"
            >
              <Icon name="heroicons:x-mark" class="w-5 h-5 text-[var(--text-muted)]" />
            </button>

            <!-- Контентная область (scrollable) -->
            <div class="flex-1 overflow-y-auto p-8">
              <!-- Заголовок -->
              <h2 class="font-bold text-orange-500 mb-4 pr-8">
                Вам необходимо заключить договор на аренду сети
              </h2>
              
              <!-- Основная информация -->
              <div class="space-y-4 mb-6">
                <div>
                  <h3 class=" text-2xl font-semibold text-[var(--text-primary)] mb-2">Мы больше не принимаем платежи</h3>
                  <p class="text-[var(--text-secondary)] leading-relaxed">
                    Уважаемые члены кооператива ПЖ19, с 01.12.2025 потребительский интернет кооператив расторгает договора на аренду сети с собственниками и более не принимает членские взносы, в связи с чем, для возобновления стабильной работы, вам необходимо самостоятельно заключить договор на аренду сети с собственником. Вы продолжите пользоваться интернетом от ПЖ19 на безвозмездной основе на правах члена кооператива.
                  </p>
                </div>
              </div>

              <!-- Раскрывающаяся дополнительная информация -->
              <Transition
                enter-active-class="transition-all duration-300 ease-out"
                leave-active-class="transition-all duration-300 ease-in"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-[2000px]"
                leave-from-class="opacity-100 max-h-[2000px]"
                leave-to-class="opacity-0 max-h-0"
              >
                <div v-if="showFullRegisterInfo" class="mb-6 overflow-hidden">
                  <div class="space-y-4">
                    <div>
                      <div class="mb-4">
                        <div class="inline-block">
                          <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-1">Почему так происходит</h3>
                          <div class="h-0.5 bg-orange-500 w-full"></div>
                        </div>
                      </div>
                      <p class="text-[var(--text-secondary)] leading-relaxed mb-4">
                        Уважаемые пайщики!
                      </p>
                      <p class="text-[var(--text-secondary)] leading-relaxed mb-4">
                        ПЖ-19 с момента создания и по сей день работает исключительно для удовлетворения Ваших потребностей в получении быстрого и качественного интернета без границ. Наше добровольное некоммерческое объединение позволило сделать интернет доступнее как с точки зрения стоимости, так и географии.
                      </p>
                      <p class="text-[var(--text-secondary)] leading-relaxed mb-4">
                        Законом РФ "О потребительской кооперации (потребительских обществах, их союзах) в Российской Федерации" от 19.06.1992 N 3085-1, установлено, что потребительское общество действует на основе принципов демократичности управления, взаимопомощи и доступности информации для всех пайщиков.
                      </p>
                      <p class="text-[var(--text-secondary)] leading-relaxed mb-4">
                        Доводим до Вашего сведения, что налоговыми органами проведена выездная налоговая проверка кооператива, по результатам которой проверяющие пришли к выводу о том, что все денежные средства, поступавшие на счет «ПЖ-19», должны облагаться налогом. Общая сумма претензий налогового органа составила более 140 миллионов рублей.
                      </p>
                      <p class="text-[var(--text-secondary)] leading-relaxed mb-4">
                        С данным решением мы не согласны, в связи с чем намерены обжаловать его в Арбитражный суд Ростовской области.
                      </p>
                      <p class="text-[var(--text-secondary)] leading-relaxed mb-4">
                        Вместе с тем, мы не можем не подчиниться требованиям налогового органа, в связи с чем, кооперативом, за счет собственных денежных средств было произведено погашение задолженности.
                      </p>
                      <p class="text-[var(--text-secondary)] leading-relaxed mb-4">
                        В свете произошедших событий, мы вынуждены внести ряд изменений в работу кооператива:
                      </p>
                      <ul class="list-disc list-inside text-[var(--text-secondary)] leading-relaxed space-y-2 mb-4">
                        <li>Стоимость членских взносов снизиться до 0 рублей.</li>
                        <li>С 01.12.2025 «ПЖ-19» перестанет принимать платежи. ОПлата будет производится непосредственно собственнику сетей, на основании заключенного договора аренды сетей, в зависимости от выбранного технического оборудования. Это позволит избежать «лишних» затрат в виде оплаты работы кооператива или наценки интернет-провайдера.</li>
                        <li>Работа кооператива станет еще более прозрачной. «ПЖ-19» по-прежнему будет гарантировать для Вас получение быстрого и качественного интернета без границ. При этом с 01.12.2025 Вы сможете видеть состав стоимости вашего интернета и в перспективе даже сможете выбрать с кем заключать договор аренды сетей в зависимости от Ваших потребностей.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Кнопки (зафиксированы внизу) -->
            <div class="flex flex-col-reverse md:flex-row gap-3 p-8 pt-4 border-t" style="border-color: var(--glass-border);">
              <UiButton
                variant="secondary"
                @click="showFullRegisterInfo = !showFullRegisterInfo"
                class="w-full md:flex-1"
              >
                {{ showFullRegisterInfo ? 'Скрыть' : 'Почему так происходит' }}
              </UiButton>
              <UiButton
                variant="primary"
                @click="navigateTo('/contract')"
                class="w-full md:flex-1"
              >
                Заключить договор
              </UiButton>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
