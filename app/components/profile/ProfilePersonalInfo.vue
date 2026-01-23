<script setup lang="ts">
/**
 * ProfilePersonalInfo — карточка персональных данных
 *
 * Особенности:
 * - Редактирование даты рождения (ФИО только через поддержку)
 * - Редактирование никнейма для чата
 * - Вычисление возраста с правильным склонением
 */

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const userStore = useUserStore()

// =============================================================================
// STATE — реактивное состояние
// =============================================================================

// Редактирование персональных данных
const isEditing = ref(false)
const isSaving = ref(false)
const editData = ref({
  lastName: '',
  firstName: '',
  middleName: '',
  birthDate: ''
})

// Редактирование никнейма
const isEditingNickname = ref(false)
const isSavingNickname = ref(false)
const nicknameInput = ref('')
const nicknameError = ref('')

// =============================================================================
// COMPUTED
// =============================================================================

// Форматированная дата рождения
const formattedBirthDate = computed(() => {
  if (!userStore.user?.birthDate) return null
  return new Date(userStore.user.birthDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})

// Возраст в годах
const age = computed(() => {
  if (!userStore.user?.birthDate) return null
  const birthDate = new Date(userStore.user.birthDate)
  const today = new Date()
  let years = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    years--
  }
  return years
})

// Склонение слова "год"
const ageLabel = computed(() => {
  if (!age.value) return ''
  const lastDigit = age.value % 10
  const lastTwoDigits = age.value % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'лет'
  if (lastDigit === 1) return 'год'
  if (lastDigit >= 2 && lastDigit <= 4) return 'года'
  return 'лет'
})

// =============================================================================
// METHODS
// =============================================================================

// Начать редактирование персональных данных
function startEdit(): void {
  editData.value = {
    lastName: userStore.user?.lastName || '',
    firstName: userStore.user?.firstName || '',
    middleName: userStore.user?.middleName || '',
    birthDate: userStore.user?.birthDate || ''
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
    lastName: editData.value.lastName,
    firstName: editData.value.firstName,
    middleName: editData.value.middleName,
    birthDate: editData.value.birthDate || null
  })
  isSaving.value = false
  if (updatedUser) {
    userStore.updateUser(updatedUser)
    isEditing.value = false
  }
}

// Начать редактирование никнейма
function startEditNickname(): void {
  nicknameInput.value = userStore.user?.nickname || ''
  nicknameError.value = ''
  isEditingNickname.value = true
}

// Отменить редактирование никнейма
function cancelEditNickname(): void {
  isEditingNickname.value = false
  nicknameError.value = ''
}

// Сохранить никнейм
async function saveNickname(): Promise<void> {
  const nickname = nicknameInput.value.trim() || null

  // Валидация
  if (nickname && (nickname.length < 2 || nickname.length > 30)) {
    nicknameError.value = 'Никнейм должен быть от 2 до 30 символов'
    return
  }

  isSavingNickname.value = true
  nicknameError.value = ''

  try {
    const response = await $fetch<{ success: boolean; nickname: string | null }>('/api/user/profile/nickname', {
      method: 'PATCH',
      body: { nickname }
    })

    if (response.success && userStore.user) {
      userStore.user.nickname = response.nickname
      isEditingNickname.value = false
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    nicknameError.value = err.data?.message || 'Ошибка сохранения'
  } finally {
    isSavingNickname.value = false
  }
}
</script>

<template>
  <UiCard class="!p-4">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-base font-semibold text-[var(--text-primary)]">Персональные данные</h2>
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
    <div v-if="!isEditing" class="grid grid-cols-2 gap-x-4 gap-y-2">
      <div class="flex items-center gap-2 py-1.5" style="border-bottom: 1px solid var(--glass-border);">
        <div class="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10">
          <Icon name="heroicons:user" class="w-4 h-4 text-primary" />
        </div>
        <div>
          <p class="text-xs text-[var(--text-muted)]">Фамилия</p>
          <p class="text-sm text-[var(--text-primary)]">{{ userStore.user?.lastName || '—' }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2 py-1.5" style="border-bottom: 1px solid var(--glass-border);">
        <div class="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10">
          <Icon name="heroicons:user" class="w-4 h-4 text-primary" />
        </div>
        <div>
          <p class="text-xs text-[var(--text-muted)]">Имя</p>
          <p class="text-sm text-[var(--text-primary)]">{{ userStore.user?.firstName || '—' }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2 py-1.5">
        <div class="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10">
          <Icon name="heroicons:user" class="w-4 h-4 text-primary" />
        </div>
        <div>
          <p class="text-xs text-[var(--text-muted)]">Отчество</p>
          <p class="text-sm text-[var(--text-primary)]">{{ userStore.user?.middleName || '—' }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2 py-1.5">
        <div class="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10">
          <Icon name="heroicons:cake" class="w-4 h-4 text-primary" />
        </div>
        <div>
          <p class="text-xs text-[var(--text-muted)]">Дата рождения</p>
          <p class="text-sm text-[var(--text-primary)]">
            <template v-if="formattedBirthDate">
              {{ formattedBirthDate }}
              <span class="text-[var(--text-muted)] text-xs">({{ age }} {{ ageLabel }})</span>
            </template>
            <template v-else>—</template>
          </p>
        </div>
      </div>
    </div>

    <!-- Edit Mode (personal data) -->
    <div v-else class="grid grid-cols-2 gap-x-4 gap-y-3">
      <div>
        <label class="text-xs text-[var(--text-muted)] mb-1 block">Фамилия</label>
        <input
          :value="userStore.user?.lastName || ''"
          type="text"
          readonly
          class="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] cursor-not-allowed"
          title="Для изменения обратитесь в поддержку"
        />
      </div>

      <div>
        <label class="text-xs text-[var(--text-muted)] mb-1 block">Имя</label>
        <input
          :value="userStore.user?.firstName || ''"
          type="text"
          readonly
          class="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] cursor-not-allowed"
          title="Для изменения обратитесь в поддержку"
        />
      </div>

      <div>
        <label class="text-xs text-[var(--text-muted)] mb-1 block">Отчество</label>
        <input
          :value="userStore.user?.middleName || ''"
          type="text"
          readonly
          class="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] cursor-not-allowed"
          title="Для изменения обратитесь в поддержку"
        />
      </div>

      <div>
        <label class="text-xs text-[var(--text-muted)] mb-1 block">Дата рождения</label>
        <input
          v-model="editData.birthDate"
          type="date"
          class="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--glass-border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <!-- Hint about readonly fields -->
      <div class="col-span-2 text-xs text-[var(--text-muted)] flex items-center gap-1 mt-1">
        <Icon name="heroicons:information-circle" class="w-3.5 h-3.5" />
        ФИО можно изменить только через поддержку
      </div>
    </div>

    <!-- Nickname Section (always visible) -->
    <div class="mt-4 pt-4" style="border-top: 1px solid var(--glass-border);">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10">
            <Icon name="heroicons:at-symbol" class="w-4 h-4 text-primary" />
          </div>
          <div>
            <p class="text-xs text-[var(--text-muted)]">Никнейм в чате</p>
            <p v-if="!isEditingNickname" class="text-sm text-[var(--text-primary)]">
              {{ userStore.user?.nickname || 'Не задан' }}
            </p>
          </div>
        </div>
        <button
          v-if="!isEditingNickname"
          class="text-xs text-primary hover:text-primary/80 transition-colors"
          @click="startEditNickname"
        >
          {{ userStore.user?.nickname ? 'Изменить' : 'Задать' }}
        </button>
      </div>

      <!-- Nickname Edit Form -->
      <div v-if="isEditingNickname" class="mt-2 space-y-2">
        <input
          v-model="nicknameInput"
          type="text"
          maxlength="30"
          class="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--glass-border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Введите никнейм (2-30 символов)"
          @keyup.enter="saveNickname"
        />
        <p v-if="nicknameError" class="text-xs text-red-500">{{ nicknameError }}</p>
        <p class="text-xs text-[var(--text-muted)]">
          Уникальное имя для отображения в чате вместо реального имени
        </p>
        <div class="flex items-center gap-2">
          <button
            class="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            @click="cancelEditNickname"
            :disabled="isSavingNickname"
          >
            Отмена
          </button>
          <button
            class="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            @click="saveNickname"
            :disabled="isSavingNickname"
          >
            <Icon v-if="isSavingNickname" name="heroicons:arrow-path" class="w-3 h-3 animate-spin" />
            {{ isSavingNickname ? 'Сохранение...' : 'Сохранить' }}
          </button>
        </div>
      </div>
    </div>
  </UiCard>
</template>
