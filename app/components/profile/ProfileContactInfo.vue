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
const config = useRuntimeConfig()
const {
  isLoading: telegramLinking,
  error: telegramLinkError,
  status: telegramLinkStatus,
  deeplink: telegramDeeplink,
  verifiedData: telegramVerifiedData,
  requestAuth: requestTelegramAuth,
  reset: resetTelegramLink
} = useTelegramDeeplink()

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

const vkCode = ref<string | null>(null)
const vkCodeExpiresAt = ref<string | null>(null)
const vkIsLoading = ref(false)
const vkError = ref<string | null>(null)
const vkStatusLoading = ref(false)

// Мобильная версия — для адаптивного отображения длинных значений
const isMobile = ref(false)

// =============================================================================
// COMPUTED
// =============================================================================

// Telegram привязан
const isTelegramLinked = computed(() => !!userStore.user?.telegramId)
const telegramUsername = computed(() => userStore.user?.telegram || '')

const vkDialogUrl = computed(() => {
  const screenName = (config.public as any).vkGroupScreenName as string | undefined
  const groupId = (config.public as any).vkGroupId as string | undefined

  if (screenName) {
    return `https://vk.me/${screenName}`
  }
  if (groupId) {
    return `https://vk.com/im?sel=-${groupId}`
  }
  return null
})

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
    readonly: false,
    isVk: true
  }
])

// =============================================================================
// METHODS
// =============================================================================

function updateIsMobile(): void {
  if (typeof window === 'undefined') return
  isMobile.value = window.innerWidth < 768
}

/** В email запрещены русские буквы — убираем кириллицу при вводе (в nextTick, чтобы перезаписать v-model) */
function onEmailInput(e: Event): void {
  const target = e.target as HTMLInputElement
  const sanitized = target.value.replace(/[\u0400-\u04FF]/g, '')
  if (sanitized !== target.value) {
    nextTick(() => { editData.value.email = sanitized })
  }
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

// Запуск привязки/перепривязки Telegram через Deeplink
async function startTelegramLink(): Promise<void> {
  if (!userStore.user?.id) return
  try {
    await requestTelegramAuth('link', userStore.user.id)
  } catch {
    // ошибка в telegramLinkError
  }
}

// Привязка/перепривязка VK ID — переход в режим редактирования
async function startVkLink(): Promise<void> {
  vkError.value = null
  vkIsLoading.value = true
  try {
    const res = await $fetch<{
      code: string
      expiresAt: string
      expiresInSeconds: number
    }>('/api/auth/vk/link-code', {
      method: 'POST'
    })

    // Если код вернулся — показываем блок с инструкцией
    if (res.code) {
      vkCode.value = res.code
      vkCodeExpiresAt.value = res.expiresAt
    }
  } catch (e: any) {
    const message = e?.data?.message || e?.message || 'Не удалось получить код привязки VK.'
    console.error('[VK Link] Error requesting link code', e)

    // Частный случай: VK уже привязан к аккаунту — просто обновляем статус из сессии
    const alreadyLinked =
      typeof message === 'string' && message.toLowerCase().includes('vk уже привязан')

    if (alreadyLinked) {
      await refreshVkStatus()
      vkError.value = null
    } else {
      vkError.value = message
    }
  } finally {
    vkIsLoading.value = false
  }
}

async function refreshVkStatus(): Promise<void> {
  vkStatusLoading.value = true
  try {
    const data = await $fetch<{ user: any; account: any }>('/api/auth/session')
    if (data?.user) {
      userStore.setUser(data.user)
      // Если VK привязался, можно скрыть код
      if (data.user.vkId) {
        vkCode.value = null
        vkCodeExpiresAt.value = null
      }
    }
  } catch (e: any) {
    console.error('[VK Status] Failed to refresh status', e)
  } finally {
    vkStatusLoading.value = false
  }
}

watch(telegramLinkStatus, (newStatus) => {
  if (newStatus === 'verified' && telegramVerifiedData.value && 'telegramId' in telegramVerifiedData.value) {
    const data = telegramVerifiedData.value
    userStore.updateUser({
      telegramId: data.telegramId,
      telegram: data.telegramUsername ? `@${data.telegramUsername}` : ''
    })
    resetTelegramLink()
  }
})

onMounted(() => {
  updateIsMobile()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateIsMobile)
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
          <!-- Telegram: кнопка привязки/перепривязки (Deeplink) -->
          <span v-if="contact.isTelegram" class="contact-link-btn">
            <UiButton
              v-if="telegramLinkStatus !== 'waiting'"
              variant="primary"
              size="sm"
              :loading="telegramLinking"
              @click="startTelegramLink"
            >
              <Icon name="simple-icons:telegram" class="w-3 h-3 mr-1 shrink-0" />
              {{ isTelegramLinked ? 'Перепривязать' : 'Привязать' }}
            </UiButton>
            <a
              v-else-if="telegramDeeplink"
              :href="telegramDeeplink"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center gap-1 w-full px-2 py-1 text-xs font-medium rounded-lg bg-[#0088cc] text-white hover:opacity-90"
            >
              <Icon name="simple-icons:telegram" class="w-3 h-3" />
              Открыть Telegram
            </a>
          </span>
          <!-- VK ID: кнопка привязки/перепривязки (та же ширина, что Telegram) -->
          <span v-else-if="contact.isVk" class="contact-link-btn">
            <UiButton
              variant="primary"
              size="sm"
              :loading="vkIsLoading"
              @click="startVkLink"
            >
              <Icon name="simple-icons:vk" class="w-3 h-3 mr-1 shrink-0" />
              {{ contact.value ? 'Перепривязать' : 'Привязать' }}
            </UiButton>
          </span>
          <!-- Бейджи статуса (для остальных полей) -->
          <UiBadge v-else-if="contact.value && contact.verified" variant="success" size="sm">
            Подтверждён
          </UiBadge>
          <UiBadge v-else-if="contact.value" variant="neutral" size="sm">
            Не подтверждён
          </UiBadge>
        </div>
      </div>

      <!-- Ошибка привязки Telegram -->
      <div v-if="telegramLinkError" class="p-2 rounded-lg bg-red-500/10 text-red-400 text-xs flex items-center gap-2 mt-2">
        <Icon name="heroicons:exclamation-circle" class="w-4 h-4 shrink-0" />
        {{ telegramLinkError }}
      </div>

      <!-- Информация о коде привязки VK -->
      <div
        v-if="vkCode"
        class="mt-3 p-3 rounded-lg border text-xs space-y-2"
        style="border-color: var(--glass-border); background: var(--glass-bg);"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-[var(--text-muted)] mb-0.5">
              Код для привязки VK (отправьте его в сообщения нашего сообщества VK):
            </p>
            <p class="font-mono text-base text-[var(--text-primary)] tracking-wider">
              {{ vkCode }}
            </p>
          </div>
          <div class="text-[var(--text-muted)] text-right">
            <span v-if="vkCodeExpiresAt">
              Действителен до
              {{ new Date(vkCodeExpiresAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }}
            </span>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <a
            v-if="vkDialogUrl"
            :href="vkDialogUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-[#2787F5] text-white text-xs font-medium hover:opacity-90"
          >
            <Icon name="simple-icons:vk" class="w-3 h-3" />
            Открыть диалог VK
          </a>
          <span class="text-[var(--text-muted)]">
            Отправьте код одним сообщением. После успешной привязки статус обновится в этом блоке.
          </span>
          <button
            type="button"
            class="text-[var(--text-primary)] text-xs underline-offset-2 underline disabled:opacity-60"
            :disabled="vkStatusLoading"
            @click="refreshVkStatus"
          >
            {{ vkStatusLoading ? 'Проверяем привязку…' : 'Проверить привязку' }}
          </button>
        </div>

        <div v-if="vkError" class="mt-2 p-2 rounded bg-red-500/10 text-red-400 flex items-center gap-1">
          <Icon name="heroicons:exclamation-circle" class="w-3 h-3" />
          <span>{{ vkError }}</span>
        </div>
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
            @input="contact.key === 'email' ? onEmailInput($event) : undefined"
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

<style scoped>
/* Кнопки Привязать/Перепривязать — компактные и одной ширины (Telegram и VK ID) */
.contact-link-btn {
  display: inline-block;
  min-width: 8.25rem;
}

.contact-link-btn :deep(.u-btn) {
  width: 100%;
  padding: 0.4rem 0.5rem;
  font-size: 0.75rem;
  min-height: auto;
}
</style>
