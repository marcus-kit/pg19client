<script setup lang="ts">
/**
 * ProfileAvatar — карточка аватара пользователя
 *
 * Особенности:
 * - Загрузка изображения через API (Supabase Storage)
 * - Удаление аватара
 * - Fallback на инициалы с градиентом
 * - Валидация: только изображения до 5 МБ
 */

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const userStore = useUserStore()

// =============================================================================
// STATE — реактивное состояние
// =============================================================================

const fileInput = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)

// =============================================================================
// COMPUTED
// =============================================================================

// Инициалы для fallback аватара
const initials = computed(() => {
  if (!userStore.user) return ''
  const first = userStore.user.firstName?.charAt(0) || ''
  const last = userStore.user.lastName?.charAt(0) || ''
  return `${first}${last}`.toUpperCase()
})

// Градиент для fallback аватара (консистентный по user id)
const avatarGradient = computed(() => {
  const gradients = [
    'from-primary to-secondary',
    'from-blue-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600'
  ]
  const index = (userStore.user?.id || 0) % gradients.length
  return gradients[index]
})

// =============================================================================
// METHODS
// =============================================================================

// Обновить аватар в store
function updateAvatar(avatar: string | null): void {
  userStore.updateUser({ avatar })
}

// Открыть диалог выбора файла
function handleAvatarClick(): void {
  fileInput.value?.click()
}

// Обработка выбора файла
async function handleFileChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  // Валидация типа файла
  if (!file.type.startsWith('image/')) {
    alert('Пожалуйста, выберите изображение')
    return
  }

  // Валидация размера
  if (file.size > 5 * 1024 * 1024) {
    alert('Размер файла не должен превышать 5 МБ')
    return
  }

  isUploading.value = true

  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await $fetch<{ success: boolean; avatar: string }>('/api/user/avatar', {
      method: 'POST',
      body: formData
    })

    if (response.success && response.avatar) {
      updateAvatar(response.avatar)
    }
  } catch (error) {
    console.error('Error uploading avatar:', error)
    alert('Ошибка при загрузке аватара')
  } finally {
    isUploading.value = false
  }
}

// Удалить аватар
async function removeAvatar(): Promise<void> {
  isUploading.value = true
  try {
    const response = await $fetch<{ success: boolean }>('/api/user/avatar', {
      method: 'DELETE'
    })
    if (response.success) {
      updateAvatar(null)
    }
  } catch (error) {
    console.error('Error removing avatar:', error)
    alert('Ошибка при удалении аватара')
  } finally {
    isUploading.value = false
  }
}
</script>

<template>
  <UiCard class="!p-4">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-base font-semibold text-[var(--text-primary)]">Фото профиля</h2>
      <button
        v-if="userStore.user?.avatar"
        class="text-sm text-red-400 hover:text-red-300 transition-colors"
        @click="removeAvatar"
      >
        Удалить
      </button>
    </div>

    <div class="flex items-center gap-4">
      <!-- Avatar -->
      <div class="relative group">
        <button
          class="relative w-16 h-16 rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          @click="handleAvatarClick"
        >
          <!-- Avatar Image or Initials -->
          <img
            v-if="userStore.user?.avatar"
            :src="userStore.user.avatar"
            :alt="userStore.fullName"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            :class="['w-full h-full bg-gradient-to-br flex items-center justify-center', avatarGradient]"
          >
            <span class="text-xl font-bold text-white">{{ initials }}</span>
          </div>

          <!-- Hover Overlay -->
          <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Icon
              :name="isUploading ? 'heroicons:arrow-path' : 'heroicons:camera'"
              :class="['w-6 h-6 text-white', { 'animate-spin': isUploading }]"
            />
          </div>
        </button>

        <!-- Hidden File Input -->
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleFileChange"
        />
      </div>

      <!-- Info -->
      <div class="flex-1">
        <p class="text-[var(--text-primary)] font-medium text-sm">{{ userStore.fullName }}</p>
        <p class="text-xs text-[var(--text-muted)] mt-0.5">
          Нажмите на фото для загрузки · JPG, PNG до 5 МБ
        </p>
      </div>
    </div>
  </UiCard>
</template>
