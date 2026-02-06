<script setup lang="ts">
/**
 * Страница заключения договора — форма для заполнения данных
 */
import IMask from 'imask'

definePageMeta({
  layout: false
})

// =============================================================================
// STATE — форма
// =============================================================================

const form = reactive({
  lastName: '',
  firstName: '',
  middleName: '',
  email: '',
  phone: ''
})

const isLoading = ref(false)
const error = ref('')

// Телефон с маской IMask
const phoneInputRef = ref<HTMLInputElement | null>(null)
let phoneMask: ReturnType<typeof IMask> | null = null
let phoneClickHandler: ((e: Event) => void) | null = null

// =============================================================================
// COMPUTED — валидация формы
// =============================================================================

// Валидация телефона: 11 цифр, начинается с 7
const phoneValid = computed(() => {
  const digits = form.phone.replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('7')
})

const phoneError = computed(() => {
  if (!form.phone.trim()) return ''
  if (!phoneValid.value) {
    return 'Введите корректный номер телефона'
  }
  return ''
})

const isFormValid = computed(() => {
  return form.lastName.trim() !== '' &&
         form.firstName.trim() !== '' &&
         form.middleName.trim() !== '' &&
         phoneValid.value
})

// =============================================================================
// METHODS
// =============================================================================

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
    form.phone = phoneMask!.unmaskedValue
    
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
        if (target.setSelectionRange) {
          target.setSelectionRange(2, 2)
        }
      }, 0)
    }
  }
  phoneInputRef.value.addEventListener('click', phoneClickHandler)
}

function openContractPdf() {
  window.open('/dogovor-oferta.pdf', '_blank')
}

async function submitContract() {
  isLoading.value = true
  error.value = ''
  
  try {
    // TODO: Реализовать отправку данных на сервер
    console.log('Данные договора:', form)
    // await $fetch('/api/contract', { method: 'POST', body: form })
  } catch (e: any) {
    error.value = e.message || 'Произошла ошибка при отправке данных'
  } finally {
    isLoading.value = false
  }
}

// =============================================================================
// LIFECYCLE — жизненный цикл компонента
// =============================================================================

onMounted(() => {
  nextTick(() => {
    setTimeout(() => initPhoneMask(), 50)
  })
})

onUnmounted(() => {
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
         HEADER — логотип (ведёт на главную)
         ===================================================================== -->
    <header class="py-6">
      <div class="container mx-auto px-4">
        <NuxtLink to="/" class="flex items-center gap-3 w-fit">
          <img src="/logo.png" alt="PG19" class="h-10" />
        </NuxtLink>
      </div>
    </header>

    <!-- =====================================================================
         CONTENT — форма заключения договора
         ===================================================================== -->
    <main class="flex-1 flex items-center justify-center px-4 py-8">
      <div class="w-full max-w-2xl space-y-6">
        <!-- Кнопка назад -->
        <NuxtLink
          to="/login"
          class="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <Icon name="heroicons:arrow-left" class="w-4 h-4" />
          Назад
        </NuxtLink>

        <!-- Заголовок -->
        <div class="text-center">
          <p class="text-sm text-orange-500 mb-2">Заключение договора с Артель МиК</p>
          <h1 class="text-3xl font-bold text-[var(--text-primary)]">Заполните данные</h1>
        </div>

      <!-- Договор оферты -->
      <UiCard padding="lg" hover @click="openContractPdf">
        <div class="flex items-center gap-4 cursor-pointer">
          <div class="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/20">
            <Icon name="heroicons:document-text" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-1">Договор оферты</h3>
            <p class="text-sm text-[var(--text-muted)]">PDF документ</p>
          </div>
          <Icon name="heroicons:arrow-top-right-on-square" class="w-5 h-5 text-[var(--text-muted)]" />
        </div>
      </UiCard>

      <!-- Форма -->
      <UiCard padding="lg">
        <div class="space-y-4">
          <UiInput
            v-model="form.lastName"
            label="Фамилия"
            placeholder="Фамилия"
            :error="error"
          />
          
          <UiInput
            v-model="form.firstName"
            label="Имя"
            placeholder="Имя"
          />
          
          <UiInput
            v-model="form.middleName"
            label="Отчество"
            placeholder="Отчество"
          />
          
          <UiInput
            v-model="form.email"
            type="email"
            label="Email (необязательно)"
            placeholder="Email (необязательно)"
          />
          
          <!-- Поле телефона с маской IMask -->
          <div class="w-full">
            <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Телефон <span class="text-primary">*</span>
            </label>
            <input
              ref="phoneInputRef"
              type="tel"
              required
              class="w-full px-4 py-3 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="{ 'border-red-500 focus:border-red-500 focus:ring-red-500/20': phoneError }"
              :style="{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)'
              }"
              placeholder="+7 (___) ___-__-__"
            />
            <p v-if="phoneError" class="mt-1.5 text-sm text-red-400">{{ phoneError }}</p>
          </div>
        </div>
      </UiCard>

      <!-- Состав услуг -->
      <UiCard padding="lg" class="relative">
        <!-- Вертикальная линия как левая рамка -->
        <div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l-2xl"></div>
        
        <!-- Контент -->
        <div class="space-y-4">
          <h2 class="text-base font-bold text-[var(--text-primary)]">Состав услуг:</h2>
          
          <!-- Адрес -->
          <div class="p-4 rounded-xl" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
            <p class="text-sm font-semibold text-[var(--text-primary)]">
              обл Ростовская, г Таганрог, пер Комсомольский, д. 27
            </p>
          </div>

          <!-- Услуги -->
          <div class="space-y-4">
              <!-- Услуга 1 -->
              <div class="flex items-start gap-4">
                <div class="flex-1 min-w-0">
                  <p class="text-sm md:text-base text-[var(--text-primary)] font-medium mb-1">
                    Ежемесячная плата за аренду участка сети передачи данных (СПД)
                  </p>
                  <p class="text-xs text-[var(--text-muted)] leading-relaxed">
                    От клиента до порта доступа ЛС АМИК<br>
                    <span class="text-[var(--text-secondary)]">г. Таганрог, Неклиновский р-н, Матвеево-курганский р-н, Мясниковский р-н</span>
                  </p>
                </div>
                <div class="text-base md:text-lg font-bold text-blue-600 dark:text-blue-400 flex-shrink-0 whitespace-nowrap ml-4">
                  399.00 Р
                </div>
              </div>

              <!-- Услуга 2 -->
              <div class="flex items-start gap-4">
                <div class="flex-1 min-w-0">
                  <p class="text-sm md:text-base text-[var(--text-primary)] font-medium mb-1">
                    Ежемесячный пакет "Режим работы порта доступа ЛС АМИК"
                  </p>
                  <p class="text-xs text-[var(--text-muted)] leading-relaxed">
                    Профиль "ИНТЕРНЕТ ПЖ19"
                  </p>
                </div>
                <div class="text-base md:text-lg font-bold text-blue-600 dark:text-blue-400 flex-shrink-0 whitespace-nowrap ml-4">
                  300.00 Р
                </div>
              </div>
            </div>
        </div>
      </UiCard>

      <!-- Кнопка отправки -->
      <div class="flex justify-center">
        <UiButton
          variant="primary"
          @click="submitContract"
          :disabled="isLoading || !isFormValid"
          style="min-width: 280px;"
        >
          {{ isLoading ? 'Отправка...' : 'Заключить договор' }}
        </UiButton>
      </div>
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
