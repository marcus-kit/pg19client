<script setup lang="ts">
/**
 * ProfileContactInfo — карточка контактной информации
 *
 * Особенности:
 * - Редактирование email и VK ID
 * - Телефон только для чтения (изменение через поддержку)
 * - Привязка Telegram
 * - Бейджи верификации контактов
 */

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const userStore = useUserStore()

const telegramOidcLinking = ref(false)

// =============================================================================
// STATE — реактивное состояние
// =============================================================================

const isEditing = ref(false)
const isSaving = ref(false)
const editData = ref({
  phone: '',
  email: '',
  vkId: ''
})

// Мобильная версия — для адаптивного отображения длинных значений
const isMobile = ref(false)

// =============================================================================
// COMPUTED
// =============================================================================

// Telegram привязан
const isTelegramLinked = computed(() => !!userStore.user?.telegramId)
const telegramUsername = computed(() => userStore.user?.telegram || '')

// Конфигурация полей контактов
const contacts = computed(() => [
  {
    key: 'phone',
    label: 'Телефон',
    value: userStore.user?.phone,
    icon: 'heroicons:phone',
    verified: true,
    type: 'tel',
    placeholder: '+7 (999) 123-45-67',
    readonly: true
  },
  {
    key: 'email',
    label: 'Email',
    value: userStore.user?.email,
    icon: 'heroicons:envelope',
    verified: true,
    type: 'email',
    placeholder: 'example@mail.ru',
    readonly: false
  },
  {
    key: 'telegram',
    label: 'Telegram',
    value: isTelegramLinked.value ? telegramUsername.value : null,
    icon: 'simple-icons:telegram',
    verified: isTelegramLinked.value,
    type: 'text',
    placeholder: '@username',
    readonly: true,
    isTelegram: true
  },
  {
    key: 'vkId',
    label: 'VK ID',
    value: userStore.user?.vkId,
    icon: 'simple-icons:vk',
    verified: false,
    type: 'text',
    placeholder: 'id123456789',
    readonly: false
  }
])

// =============================================================================
// METHODS
// =============================================================================

function updateIsMobile(): void {
  if (typeof window === 'undefined') return
  isMobile.value = window.innerWidth < 768
}

function truncateMobileValue(value: string, maxChars = 20): string {
  if (!isMobile.value) return value
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars)}...`
}

function formatContactValue(contact: { key: string; value?: string | null }): string {
  const raw = contact.value || ''
  if (!raw) return '—'

  // Только для mobile и только для email / vkId
  if (contact.key === 'email' || contact.key === 'vkId') {
    return truncateMobileValue(raw, 20)
  }
  return raw
}

// Начать редактирование
function startEdit(): void {
  editData.value = {
    phone: userStore.user?.phone || '',
    email: userStore.user?.email || '',
    vkId: userStore.user?.vkId || ''
  }
  isEditing.value = true
}

// Отменить редактирование
function cancelEdit(): void {
  isEditing.value = false
}

// Сохранить изменения
async function saveChanges(): Promise<void> {
  if (!userStore.user?.id) return
  isSaving.value = true
  const updatedUser = await useUserApi().update(userStore.user.id, {
    phone: editData.value.phone,
    email: editData.value.email,
    vkId: editData.value.vkId
  })
  isSaving.value = false
  if (updatedUser) {
    userStore.updateUser(updatedUser)
    isEditing.value = false
  }
}

// Запуск привязки/перепривязки Telegram через OIDC
function startTelegramLink(): void {
  if (!userStore.user?.id) return
  telegramOidcLinking.value = true
  window.location.href = '/api/auth/telegram/authorize?purpose=link'
}

const route = useRoute()

onMounted(async () => {
  updateIsMobile()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateIsMobile)
  }
  // Успешная привязка — обновить store
  if (route.query.telegram_linked === '1') {
    try {
      const user = await $fetch<{ telegramId: string | null; telegram: string }>('/api/user/me')
      userStore.updateUser({ telegramId: user.telegramId, telegram: user.telegram })
    } catch {
      // ignore
    }
    navigateTo({ path: '/profile', query: {} }, { replace: true })
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateIsMobile)
  }
})
</script>

<template>
  <UiCard class="!p-4">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-base font-semibold text-[var(--text-primary)]">Контакты</h2>
      <div v-if="!isEditing">
        <button
          class="text-sm text-primary hover:text-primary/80 transition-colors"
          @click="startEdit"
        >
          Редактировать
        </button>
      </div>
      <div v-else class="flex items-center gap-2">
        <button
          class="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          @click="cancelEdit"
          :disabled="isSaving"
        >
          Отмена
        </button>
        <button
          class="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          @click="saveChanges"
          :disabled="isSaving"
        >
          <Icon v-if="isSaving" name="heroicons:arrow-path" class="w-3 h-3 animate-spin" />
          {{ isSaving ? 'Сохранение...' : 'Сохранить' }}
        </button>
      </div>
    </div>

    <!-- View Mode -->
    <div v-if="!isEditing" class="grid grid-cols-1 gap-y-2">
      <div
        v-for="(contact, index) in contacts"
        :key="contact.key"
        class="flex items-center justify-between py-1.5"
        :style="index < contacts.length - 1 ? 'border-bottom: 1px solid var(--glass-border);' : ''"
      >
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <div class="w-5 h-5 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center flex-shrink-0">
            <Icon :name="contact.icon" class="w-full h-full text-primary" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs text-[var(--text-muted)]">{{ contact.label }}</p>
            <p
              v-if="contact.value"
              class="text-sm text-[var(--text-primary)] truncate"
              :title="contact.value || ''"
            >
              {{ formatContactValue(contact) }}
            </p>
            <p v-else class="text-sm text-[var(--text-muted)]">Не указан</p>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- Telegram: кнопка привязки или перепривязки -->
          <UiButton
            v-if="contact.isTelegram"
            size="sm"
            :variant="isTelegramLinked ? 'secondary' : 'primary'"
            :loading="telegramOidcLinking"
            @click="startTelegramLink"
          >
            <Icon name="simple-icons:telegram" class="w-3 h-3 mr-1" />
            {{ isTelegramLinked ? 'Перепривязать' : 'Привязать' }}
          </UiButton>
          <!-- Бейджи статуса (для не-Telegram полей) -->
          <UiBadge v-else-if="contact.value && contact.verified" variant="success" size="sm">
            Подтверждён
          </UiBadge>
          <UiBadge v-else-if="contact.value" variant="neutral" size="sm">
            Не подтверждён
          </UiBadge>
        </div>
      </div>

      <!-- Ошибка из query (после OIDC callback) -->
      <div v-if="route.query?.error" class="p-2 rounded-lg bg-red-500/10 text-red-400 text-xs flex items-center gap-2 mt-2">
        <Icon name="heroicons:exclamation-circle" class="w-4 h-4 shrink-0" />
        {{ decodeURIComponent(String(route.query.error)) }}
      </div>
    </div>

    <!-- Edit Mode -->
    <div v-else class="space-y-3">
      <div v-for="contact in contacts" :key="contact.key">
        <label class="text-xs text-[var(--text-muted)] mb-1 block">{{ contact.label }}</label>
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
            <Icon :name="contact.icon" class="w-full h-full text-primary" />
          </div>
          <!-- Telegram - только просмотр, не редактируется -->
          <div v-if="contact.isTelegram" class="flex-1 px-3 py-1.5 text-sm rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] cursor-not-allowed">
            {{ contact.value || 'Не привязан' }}
          </div>
          <input
            v-else-if="contact.readonly"
            :value="contact.value || ''"
            :type="contact.type"
            readonly
            class="flex-1 px-3 py-1.5 text-sm rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] cursor-not-allowed"
            title="Для изменения обратитесь в поддержку"
          />
          <input
            v-else
            v-model="editData[contact.key as keyof typeof editData]"
            :type="contact.type"
            class="flex-1 px-3 py-1.5 text-sm rounded-lg border border-[var(--glass-border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/50"
            :placeholder="contact.placeholder"
          />
        </div>
      </div>
      <!-- Hint about readonly fields -->
      <div class="text-xs text-[var(--text-muted)] flex items-center gap-1 pt-1">
        <Icon name="heroicons:information-circle" class="w-3.5 h-3.5" />
        Телефон и Telegram можно изменить только через поддержку / привязку
      </div>
    </div>
  </UiCard>
</template>
