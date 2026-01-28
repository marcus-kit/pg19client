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

    <!-- Content — карточка авторизации -->
    <main class="flex-1 flex items-center justify-center px-4 py-8 min-h-[60vh]">
      <div class="w-full max-w-md">
        <UiCard padding="lg" class="shadow-xl">
          <!-- Логотип и заголовок -->
          <div class="text-center mb-6">
            <img src="/logo.png" alt="" class="h-10 mx-auto mb-4 opacity-90" />
            <h1 class="text-xl font-bold tracking-tight text-[var(--text-primary)] mb-2">Вход в личный кабинет</h1>
            <p class="text-sm text-[var(--text-muted)]">Выберите способ входа</p>
          </div>

          <!-- Табы — сегмент-контрол -->
          <div class="flex mb-6 p-1 rounded-xl border" style="background: var(--glass-bg); border-color: var(--glass-border);">
            <button
              @click="setAuthMethod('telegram')"
              type="button"
              class="flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
              :class="authMethod === 'telegram'
                ? 'bg-[#0088cc] text-white shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
            >
              <Icon name="simple-icons:telegram" class="w-4 h-4" />
              Telegram
            </button>
            <button
              @click="setAuthMethod('contract')"
              type="button"
              class="flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
              :class="authMethod === 'contract'
                ? 'bg-primary text-white shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
            >
              <Icon name="heroicons:document-text" class="w-4 h-4" />
              Договор
            </button>
            <button
              @click="setAuthMethod('call')"
              type="button"
              class="flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
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
                <p class="text-[var(--text-muted)] mb-4">
                  Откройте Telegram и нажмите Start в боте
                </p>

                <!-- Кнопка-ссылка на Telegram бота -->
                <a
                  :href="telegramDeeplink"
                  target="_blank"
                  class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white bg-[#0088cc] hover:bg-[#0077b5] transition-colors mb-6"
                >
                  <Icon name="simple-icons:telegram" class="w-5 h-5" />
                  Открыть @{{ botUsername }}
                </a>

                <!-- Таймер обратного отсчёта -->
                <div class="flex items-center justify-center gap-2 text-[var(--text-muted)] mb-6">
                  <Icon name="heroicons:clock" class="w-5 h-5" />
                  <span class="font-mono">{{ telegramTimer }}</span>
                </div>

                <!-- Анимация ожидания (спиннер) -->
                <div class="relative w-20 h-20 mx-auto mb-6">
                  <div class="absolute inset-0 rounded-full border-4 border-[#0088cc]/20"></div>
                  <div class="absolute inset-0 rounded-full border-4 border-[#0088cc] border-t-transparent animate-spin"></div>
                  <Icon name="simple-icons:telegram" class="absolute inset-0 m-auto w-8 h-8 text-[#0088cc]" />
                </div>

                <button
                  @click="resetTelegram"
                  class="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
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
              label="Фамилия"
              placeholder="Иванов"
            />

            <UiInput
              v-model="form.firstName"
              type="text"
              label="Имя"
              placeholder="Иван"
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
          <div class="mt-6 pt-6 text-center" style="border-top: 1px solid var(--glass-border);">
            <a href="https://pg19.doka.team" class="text-sm text-[var(--text-muted)] hover:text-primary transition-colors">
              Вернуться на главную
            </a>
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

  </div>
</template>
