<script setup lang="ts">
/**
 * Страница регистрации — заключение договора с Артель МиК
 *
 * Стилистика соответствует странице входа (login)
 */
import IMask from 'imask'

definePageMeta({
  layout: false
})

const OFFERTA_PDF_URL = 'https://taganrog.pg19.ru/wp-content/themes/pg19.ru/assets/documents/dogovor-oferta.pdf'

// =============================================================================
// STATE
// =============================================================================

const form = reactive({
  lastName: '',
  firstName: '',
  middleName: '',
  email: ''
})

const phoneValue = ref('')
const errors = reactive<Record<string, string>>({})
const phoneInputRef = ref<HTMLInputElement | null>(null)
let phoneMaskInstance: ReturnType<typeof IMask> | null = null

// =============================================================================
// COMPUTED
// =============================================================================

const phoneDigits = computed(() => phoneValue.value.replace(/\D/g, ''))
const phoneValid = computed(() => phoneDigits.value.length === 11 && phoneDigits.value.startsWith('7'))

// Проверяем, заполнены ли все обязательные поля
const formValid = computed(() => {
  return (
    form.lastName.trim() &&
    form.firstName.trim() &&
    form.middleName.trim() &&
    phoneValid.value
  )
})

// =============================================================================
// METHODS
// =============================================================================

function validate(): boolean {
  errors.lastName = ''
  errors.firstName = ''
  errors.middleName = ''
  errors.phone = ''

  let valid = true
  if (!form.lastName.trim()) {
    errors.lastName = 'Обязательное поле'
    valid = false
  }
  if (!form.firstName.trim()) {
    errors.firstName = 'Обязательное поле'
    valid = false
  }
  if (!form.middleName.trim()) {
    errors.middleName = 'Обязательное поле'
    valid = false
  }
  if (!phoneValid.value) {
    errors.phone = 'Введите корректный номер телефона'
    valid = false
  }
  return valid
}

function handleSubmit() {
  if (!formValid.value) return
  
  if (validate()) {
    // Здесь будет логика отправки формы
    console.log('Форма отправлена:', { ...form, phone: phoneDigits.value })
    
    // Пример перенаправления:
    // navigateTo('/success')
  }
}

function initPhoneMask() {
  if (phoneMaskInstance || !phoneInputRef.value) return

  phoneMaskInstance = IMask(phoneInputRef.value, {
    mask: '+{7} (000) 000-00-00',
    lazy: false,
    placeholderChar: '_',
    overwrite: true,
    autofix: true
  })

  phoneMaskInstance.on('accept', () => {
    phoneValue.value = phoneMaskInstance!.unmaskedValue
  })
}

// =============================================================================
// WATCHERS
// =============================================================================

watch(phoneValue, (val) => {
  if (phoneMaskInstance && phoneMaskInstance.unmaskedValue !== val) {
    phoneMaskInstance.unmaskedValue = val || ''
  }
})

// Валидация в реальном времени (опционально)
watch([() => form.lastName, () => form.firstName, () => form.middleName, phoneValid], () => {
  validate()
})

// =============================================================================
// LIFECYCLE
// =============================================================================

onMounted(() => {
  nextTick(() => setTimeout(initPhoneMask, 50))
})

onUnmounted(() => {
  phoneMaskInstance?.destroy()
  phoneMaskInstance = null
})
</script>

<template>
  <div class="min-h-screen mesh-gradient-hero flex flex-col">
    <!-- Header -->
    <header class="py-4 md:py-6">
      <div class="container mx-auto px-4">
        <NuxtLink to="/login" class="flex items-center gap-3 w-fit">
          <img src="/logo.png" alt="PG19" class="h-8 md:h-10" />
        </NuxtLink>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1 flex items-center justify-center px-4 py-4 md:py-8 min-h-0 md:min-h-[60vh]">
      <div class="w-full max-w-2xl">
        <UiCard class="shadow-xl" padding="compact">
          <!-- Кнопка назад -->
          <NuxtLink
            to="/login"
            class="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-primary transition-colors mb-4"
          >
            <Icon name="heroicons:arrow-left" class="w-4 h-4" />
            Назад
          </NuxtLink>

          <!-- Логотип и заголовок -->
          <div class="text-center mb-4 md:mb-6">
            <img src="/logo.png" alt="" class="h-8 md:h-10 mx-auto mb-3 md:mb-4 opacity-90" />
            <h1 class="text-lg md:text-xl font-bold tracking-tight text-[var(--text-primary)] mb-1 md:mb-2">
              Заключение договора с Артель МиК
            </h1>
            <p class="text-xs md:text-sm text-[var(--text-muted)]">Заполните данные</p>
          </div>

          <!-- Блок «Договор оферты» -->
          <div class="mb-6 p-4 rounded-xl flex items-center gap-3" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style="background: var(--glass-bg);">
              <Icon name="heroicons:document-text" class="w-6 h-6 text-red-500" />
            </div>
            <a
              :href="OFFERTA_PDF_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-2"
            >
              Договор оферты
              <Icon name="heroicons:arrow-top-right-on-square" class="w-4 h-4" />
            </a>
          </div>

          <!-- Форма -->
          <div class="space-y-4">
            <UiInput
              v-model="form.lastName"
              type="text"
              label="Фамилия"
              placeholder="Иванов"
              :error="errors.lastName"
            />
            <UiInput
              v-model="form.firstName"
              type="text"
              label="Имя"
              placeholder="Иван"
              :error="errors.firstName"
            />
            <UiInput
              v-model="form.middleName"
              type="text"
              label="Отчество"
              placeholder="Иванович"
              :error="errors.middleName"
            />
            <UiInput
              v-model="form.email"
              type="email"
              label="Email (необязательно)"
              placeholder="example@mail.ru"
            />
            <div class="w-full">
              <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Телефон <span class="text-primary">*</span>
              </label>
              <input
                ref="phoneInputRef"
                type="tel"
                class="w-full px-4 py-3 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                :class="{ 'border-red-500 focus:border-red-500 focus:ring-red-500/20': errors.phone }"
                style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
                placeholder="+7 (___) ___-__-__"
              />
              <p v-if="errors.phone" class="mt-1.5 text-sm text-red-400">{{ errors.phone }}</p>
            </div>
          </div>

          <!-- Блок «Состав услуг» -->
          <div class="mt-6 p-4 rounded-xl space-y-4" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
            <h3 class="text-sm font-semibold text-[var(--text-primary)]">Состав услуг:</h3>
            <p class="text-sm text-[var(--text-secondary)]">
              обл Ростовская, г Таганрог, пер Комсомольский, д. 27
            </p>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between gap-4">
                <span class="text-[var(--text-secondary)] flex-1">
                  Ежемесячная плата за аренду участка сети передачи данных (СПД) от клиента до порта доступа ЛС АМИК - г. Таганрог, Неклиновский р-н, Матвеево-курганский р-н, Мясниковский р-н
                </span>
                <span class="font-medium text-[var(--text-primary)] whitespace-nowrap">399.00 ₽</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-[var(--text-secondary)] flex-1">
                  Ежемесячный пакет "Режим работы порта доступа ЛС АМИК - Профиль "ИНТЕРНЕТ ПЖ19""
                </span>
                <span class="font-medium text-[var(--text-primary)] whitespace-nowrap">300.00 ₽</span>
              </div>
            </div>
            
            <!-- Кнопка заключения договора (ИЗМЕНЕНО) -->
            <button
              :disabled="!formValid"
              :class="[
                'u-btn u-btn--primary u-btn--md u-btn--block mt-4 inline-flex items-center justify-center gap-2 transition-all duration-200',
                !formValid ? 'opacity-50 cursor-not-allowed hover:opacity-50' : 'hover:opacity-90'
              ]"
              @click="handleSubmit"
            >
              <Icon 
                v-if="!formValid" 
                name="heroicons:lock-closed" 
                class="w-4 h-4" 
              />
              {{ formValid ? 'Заключить договор' : 'Заполните все поля' }}
            </button>
            
          </div>

          <!-- Ссылка на вход -->
          <div class="mt-6 pt-4 text-center" style="border-top: 1px solid var(--glass-border);">
            <NuxtLink to="/login" class="text-sm text-[var(--text-muted)] hover:text-primary transition-colors">
              Уже есть аккаунт? Войти
            </NuxtLink>
          </div>
        </UiCard>
      </div>
    </main>

    <!-- Footer -->
    <footer class="py-4 md:py-6 text-center text-gray-500 text-xs md:text-sm">
      <p>&copy; {{ new Date().getFullYear() }} ПЖ19</p>
    </footer>
  </div>
</template>