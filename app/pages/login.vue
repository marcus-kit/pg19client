<script setup lang="ts">
/**
 * Страница авторизации — три метода входа:
 * 1. Telegram — через deeplink (открывает Telegram → /start → Realtime подписка)
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

// Telegram Deeplink — создаёт токен, слушает Realtime, получает данные при /start
const {
  isLoading: telegramLoading,
  error: telegramError,
  status: telegramStatus,         // 'idle' | 'waiting' | 'verified' | 'expired'
  deeplink: telegramDeeplink,     // URL для открытия бота
  remainingSeconds: telegramRemainingSeconds,
  verifiedData: telegramVerifiedData,
  botUsername,
  requestAuth: requestTelegramAuth,
  reset: resetTelegram
} = useTelegramDeeplink()

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
  lastName: '',
  firstName: ''
})

const isLoading = ref(false)  // Загрузка формы договора
const error = ref('')         // Общая ошибка (для договора)

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

const telegramTimer = computed(() => formatTimer(telegramRemainingSeconds.value))
const callTimer = computed(() => formatTimer(remainingSeconds.value))

// =============================================================================
// METHODS — обработчики событий
// =============================================================================

// Переключение метода авторизации (сбрасывает состояние других методов)
function setAuthMethod(method: 'telegram' | 'contract' | 'call'): void {
  authMethod.value = method
  error.value = ''
  if (method !== 'call') resetCall()
  if (method !== 'telegram') resetTelegram()
}

// Запуск Telegram авторизации — создаёт токен и показывает deeplink
async function startTelegramAuth(): Promise<void> {
  error.value = ''
  await requestTelegramAuth('login')
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

// Автоматический вход при успешной верификации звонка
watch(callStatus, async (newStatus) => {
  if (newStatus === 'verified' && verifiedData.value?.user && verifiedData.value?.account) {
    await authInit(verifiedData.value.user, verifiedData.value.account)
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

// Автоматический вход при успешной Telegram авторизации
watch(telegramStatus, async (newStatus) => {
  if (newStatus === 'verified' && telegramVerifiedData.value) {
    const data = telegramVerifiedData.value as any
    if (data.user && data.account) {
      await authInit(data.user, data.account)
      await nextTick()
      await navigateTo('/dashboard')
    }
  }
})

// Синхронизация маски при программном изменении callPhone
watch(callPhone, (newValue) => {
  if (phoneMask && phoneMask.unmaskedValue !== newValue) {
    phoneMask.unmaskedValue = newValue || ''
  }
})

// Инициализация маски при переключении на таб "Звонок"
watch(authMethod, async (method) => {
  if (method === 'call') {
    await nextTick()
    setTimeout(() => initPhoneMask(), 50)
  } else {
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
// LIFECYCLE — жизненный цикл компонента
// =============================================================================

onUnmounted(() => {
  resetTelegram()
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
      <div class="container mx-auto px-4">
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
               TELEGRAM — авторизация через deeplink
               Состояния: idle → waiting → verified/expired
               ----------------------------------------------------------------- -->
          <div v-if="authMethod === 'telegram'" class="space-y-4">

            <!-- Шаг 1: Начальный экран — кнопка входа -->
            <template v-if="telegramStatus === 'idle'">
              <p class="text-sm text-[var(--text-muted)] text-center">
                Нажмите кнопку для входа через Telegram
              </p>

              <UiButton
                variant="primary"
                block
                :loading="telegramLoading"
                class="!bg-[#0088cc] hover:!bg-[#0077b5]"
                @click="startTelegramAuth"
              >
                <Icon name="simple-icons:telegram" class="w-5 h-5 mr-2" />
                Войти через Telegram
              </UiButton>

              <!-- Подсказка для новых пользователей -->
              <div class="p-3 rounded-lg text-sm" style="background: var(--glass-bg);">
                <p class="text-[var(--text-muted)]">
                  <Icon name="heroicons:information-circle" class="w-4 h-4 inline mr-1" />
                  Если ваш Telegram не привязан к аккаунту, войдите по номеру договора и привяжите его в профиле.
                </p>
              </div>
            </template>

            <!-- Шаг 2: Ожидание подтверждения — показываем ссылку на бота -->
            <template v-else-if="telegramStatus === 'waiting'">
              <div class="text-center">
                <p class="text-[var(--text-muted)] mb-3 text-sm md:text-base">
                  Откройте Telegram и нажмите Start в боте
                </p>

                <!-- Кнопка-ссылка на Telegram бота -->
                <a
                  :href="telegramDeeplink"
                  target="_blank"
                  class="inline-flex items-center justify-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl font-medium text-sm md:text-base text-white bg-[#0088cc] hover:bg-[#0077b5] transition-colors mb-3 md:mb-6"
                >
                  <Icon name="simple-icons:telegram" class="w-4 h-4 md:w-5 md:h-5" />
                  Открыть @{{ botUsername }}
                </a>

                <!-- Таймер обратного отсчёта -->
                <div class="flex items-center justify-center gap-1.5 md:gap-2 text-[var(--text-muted)] mb-3 md:mb-6 text-xs md:text-sm">
                  <Icon name="heroicons:clock" class="w-4 h-4 md:w-5 md:h-5" />
                  <span class="font-mono">{{ telegramTimer }}</span>
                </div>

                <!-- Анимация ожидания (спиннер) - компактная на мобилке -->
                <div class="relative w-12 h-12 md:w-20 md:h-20 mx-auto mb-3 md:mb-6">
                  <div class="absolute inset-0 rounded-full border-2 md:border-4 border-[#0088cc]/20"></div>
                  <div class="absolute inset-0 rounded-full border-2 md:border-4 border-[#0088cc] border-t-transparent animate-spin"></div>
                  <Icon name="simple-icons:telegram" class="absolute inset-0 m-auto w-5 h-5 md:w-8 md:h-8 text-[#0088cc]" />
                </div>

                <button
                  @click="resetTelegram"
                  class="text-xs md:text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Отмена
                </button>
              </div>
            </template>

            <!-- Шаг 3: Успешная авторизация — редирект на дашборд -->
            <template v-else-if="telegramStatus === 'verified'">
              <div class="text-center py-4">
                <Icon name="heroicons:check-circle" class="w-16 h-16 text-accent mx-auto mb-4" />
                <p class="text-lg font-medium text-[var(--text-primary)]">Авторизация успешна!</p>
                <p class="text-sm text-[var(--text-muted)]">Перенаправляем в личный кабинет...</p>
              </div>
            </template>

            <!-- Шаг 4: Время истекло — предложение повторить -->
            <template v-else-if="telegramStatus === 'expired'">
              <div class="text-center py-4">
                <Icon name="heroicons:x-circle" class="w-16 h-16 text-red-500 mx-auto mb-4" />
                <p class="text-lg font-medium text-[var(--text-primary)] mb-4">Время истекло</p>
                <UiButton variant="primary" @click="resetTelegram">
                  Попробовать снова
                </UiButton>
              </div>
            </template>
          </div>

          <!-- -----------------------------------------------------------------
               ДОГОВОР — авторизация по номеру договора + ФИО
               ----------------------------------------------------------------- -->
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
              label="Логин"
              placeholder="Логин"
            />

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
