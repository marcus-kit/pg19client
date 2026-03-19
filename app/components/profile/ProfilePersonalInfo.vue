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

const isEditing = ref(false)
const editBirthDate = ref('')
const isSaving = ref(false)

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

function startEditing() {
  if (userStore.user?.birthDate) {
    editBirthDate.value = new Date(userStore.user.birthDate).toISOString().slice(0, 10)
  } else {
    editBirthDate.value = ''
  }
  isEditing.value = true
}

function cancelEditing() {
  isEditing.value = false
}

async function saveBirthDate() {
  if (isSaving.value) return
  isSaving.value = true
  try {
    const { data } = await useFetch('/api/user/update', {
      method: 'POST',
      body: { data: { birthDate: editBirthDate.value || null } }
    })
    if (data.value?.success && data.value.user) {
      userStore.updateUser(data.value.user as Partial<import('~/types').User>)
    }
    isEditing.value = false
  } finally {
    isSaving.value = false
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
          @click="startEditing"
        >
          Редактировать
        </button>
      </div>
      <div v-else class="flex items-center gap-2">
        <button
          class="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          @click="cancelEditing"
          :disabled="isSaving"
        >
          Отмена
        </button>
        <button
          class="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          @click="saveBirthDate"
          :disabled="isSaving"
        >
          <Icon v-if="isSaving" name="heroicons:arrow-path" class="w-3 h-3 animate-spin" />
          {{ isSaving ? 'Сохранение...' : 'Сохранить' }}
        </button>
      </div>
    </div>

    <!-- View Mode -->
    <div class="grid grid-cols-1 gap-y-2">
      <div class="flex items-center gap-2 py-1.5" style="border-bottom: 1px solid var(--glass-border);">
        <div class="w-5 h-5 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
          <Icon name="heroicons:user" class="w-full h-full text-primary" />
        </div>
        <div>
          <p class="text-xs text-[var(--text-muted)]">Фамилия</p>
          <p class="text-sm text-[var(--text-primary)]">{{ userStore.user?.lastName || '—' }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2 py-1.5" style="border-bottom: 1px solid var(--glass-border);">
        <div class="w-5 h-5 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
          <Icon name="heroicons:user" class="w-full h-full text-primary" />
        </div>
        <div>
          <p class="text-xs text-[var(--text-muted)]">Имя</p>
          <p class="text-sm text-[var(--text-primary)]">{{ userStore.user?.firstName || '—' }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2 py-1.5" style="border-bottom: 1px solid var(--glass-border);">
        <div class="w-5 h-5 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
          <Icon name="heroicons:user" class="w-full h-full text-primary" />
        </div>
        <div>
          <p class="text-xs text-[var(--text-muted)]">Отчество</p>
          <p class="text-sm text-[var(--text-primary)]">{{ userStore.user?.middleName || '—' }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2 py-1.5">
        <div class="w-5 h-5 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
          <Icon name="heroicons:cake" class="w-full h-full text-primary" />
        </div>
        <div class="flex-1">
          <p class="text-xs text-[var(--text-muted)]">Дата рождения</p>
          <!-- View mode -->
          <p v-if="!isEditing" class="text-sm text-[var(--text-primary)]">
            <template v-if="formattedBirthDate">
              {{ formattedBirthDate }}
              <span class="text-[var(--text-muted)] text-xs">({{ age }} {{ ageLabel }})</span>
            </template>
            <template v-else>—</template>
          </p>
          <!-- Edit mode -->
          <div v-else class="mt-1">
            <input
              v-model="editBirthDate"
              type="date"
              class="text-sm rounded-lg px-2 py-1 border bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary"
              style="border-color: var(--glass-border);"
            />
          </div>
        </div>
      </div>
    </div>
  </UiCard>
</template>
