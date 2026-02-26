<script setup lang="ts">
/**
 * ProfileSecurity — настройки безопасности
 *
 * Особенности:
 * - Смена пароля (модальное окно)
 * - Список активных сессий с возможностью завершения
 * - Массовое завершение всех сессий
 */
import { formatRelativeDate } from '~/composables/useFormatters'

// =============================================================================
// STORES & COMPOSABLES
// =============================================================================

const sessionsStore = useSessionsStore()
const sessionsApi = useSessionsApi()
const { logout } = useAuthInit()

// =============================================================================
// STATE — реактивное состояние
// =============================================================================

const showPasswordModal = ref(false)
const passwordForm = ref({
  current: '',
  new: '',
  confirm: ''
})

// =============================================================================
// METHODS
// =============================================================================

// Получить иконку устройства
function getDeviceIcon(device: string): string {
  const lower = device.toLowerCase()
  if (lower.includes('iphone') || lower.includes('android') || lower.includes('phone')) {
    return 'heroicons:device-phone-mobile'
  }
  if (lower.includes('ipad') || lower.includes('tablet')) {
    return 'heroicons:device-tablet'
  }
  return 'heroicons:computer-desktop'
}

// Обработка смены пароля
function handlePasswordChange(): void {
  if (passwordForm.value.new !== passwordForm.value.confirm) {
    alert('Пароли не совпадают')
    return
  }
  if (passwordForm.value.new.length < 8) {
    alert('Пароль должен содержать минимум 8 символов')
    return
  }

  // TODO: Реализовать API для смены пароля
  alert('Функция смены пароля в разработке')
  showPasswordModal.value = false
  passwordForm.value = { current: '', new: '', confirm: '' }
}

// Завершить одну сессию
async function terminateSession(sessionId: string): Promise<void> {
  if (!confirm('Завершить сессию?')) return
  const { ok, currentSessionTerminated } = await sessionsApi.terminate(sessionId)
  if (ok) {
    sessionsStore.remove(sessionId)
    if (currentSessionTerminated) {
      logout()
      await navigateTo('/login')
    }
  }
}

// Завершить все сессии кроме текущей
async function terminateAllSessions(): Promise<void> {
  if (!confirm('Завершить все сессии кроме текущей?')) return
  const toTerminate = sessionsStore.sessions.filter(s => !s.current)
  for (const s of toTerminate) {
    const { ok, currentSessionTerminated } = await sessionsApi.terminate(s.id)
    if (ok) {
      sessionsStore.remove(s.id)
      if (currentSessionTerminated) {
        logout()
        await navigateTo('/login')
        return
      }
    }
  }
}
</script>

<template>
  <UiCard>
    <div class="flex items-center justify-between mb-3 md:mb-5">
      <h2 class="text-base md:text-lg font-semibold text-[var(--text-primary)]">Безопасность</h2>
    </div>

    <!-- Password Section -->
    <div class="mb-4 md:mb-6 pb-4 md:pb-6" style="border-bottom: 1px solid var(--glass-border);">
      <div class="flex items-center justify-between gap-2 md:gap-0">
        <div class="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <div class="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 flex-shrink-0">
            <Icon name="heroicons:key" class="w-4 h-4 md:w-5 md:h-5 text-primary" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm md:text-base text-[var(--text-primary)] font-medium">Пароль</p>
          </div>
        </div>
        <UiButton size="sm" variant="secondary" @click="showPasswordModal = true" class="flex-shrink-0 text-xs md:text-sm px-2 md:px-3">
          Изменить
        </UiButton>
      </div>
    </div>

    <!-- Active Sessions -->
    <div>
      <div class="flex items-center justify-between mb-3 md:mb-4">
        <p class="text-xs md:text-sm text-[var(--text-muted)]">Активные сессии</p>
        <button
          v-if="sessionsStore.sessions.length > 1"
          class="text-xs text-red-400 hover:text-red-300 transition-colors"
          @click="terminateAllSessions"
        >
          Завершить все
        </button>
      </div>

      <div class="space-y-2 md:space-y-3">
        <div
          v-for="session in sessionsStore.sessions"
          :key="session.id"
          :class="[
            'p-2 md:p-3 rounded-lg md:rounded-xl',
            session.current ? 'bg-primary/10 border border-primary/30' : ''
          ]"
          :style="!session.current ? 'background: var(--glass-bg);' : ''"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              <div :class="[
                'p-1.5 md:p-2 rounded-lg md:rounded-xl flex-shrink-0',
                session.current ? 'bg-gradient-to-br from-primary/20 to-secondary/10' : ''
              ]" :style="!session.current ? 'background: var(--glass-bg);' : ''">
                <Icon
                  :name="getDeviceIcon(session.device)"
                  :class="['w-4 h-4 md:w-5 md:h-5', session.current ? 'text-primary' : 'text-[var(--text-muted)]']"
                />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 md:gap-2 flex-wrap">
                  <p class="text-xs md:text-sm text-[var(--text-primary)] font-medium truncate">{{ session.device }}</p>
                  <UiBadge v-if="session.current" variant="success" size="sm" class="text-[10px] md:text-xs">
                    Текущая
                  </UiBadge>
                </div>
                <p class="text-[10px] md:text-xs text-[var(--text-muted)] truncate">{{ session.browser }}</p>
                <p class="text-[10px] md:text-xs text-[var(--text-muted)] mt-0.5 md:mt-1 truncate">
                  {{ session.location }} · {{ session.ip }}
                </p>
                <p class="text-[10px] md:text-xs text-[var(--text-muted)] mt-0.5 md:hidden">{{ formatRelativeDate(session.lastActive) }}</p>
              </div>
            </div>
            <div class="text-right flex-shrink-0 flex flex-col items-end gap-1">
              <p class="text-[10px] md:text-xs text-[var(--text-muted)] hidden md:block">{{ formatRelativeDate(session.lastActive) }}</p>
              <button
                v-if="!session.current"
                class="text-[10px] md:text-xs text-red-400 hover:text-red-300 transition-colors whitespace-nowrap"
                @click="terminateSession(session.id)"
              >
                Завершить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Password Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showPasswordModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          @click.self="showPasswordModal = false"
        >
          <div class="w-full max-w-md rounded-2xl p-6" style="background: var(--bg-surface); border: 1px solid var(--glass-border);">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-[var(--text-primary)]">Изменить пароль</h3>
              <button
                class="p-1 rounded-lg hover:bg-[var(--glass-bg)] transition-colors"
                @click="showPasswordModal = false"
              >
                <Icon name="heroicons:x-mark" class="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>

            <form class="space-y-4" @submit.prevent="handlePasswordChange">
              <div>
                <label class="block text-sm text-[var(--text-muted)] mb-2">Текущий пароль</label>
                <input
                  v-model="passwordForm.current"
                  type="password"
                  class="w-full px-4 py-3 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
                  placeholder="Введите текущий пароль"
                  required
                />
              </div>

              <div>
                <label class="block text-sm text-[var(--text-muted)] mb-2">Новый пароль</label>
                <input
                  v-model="passwordForm.new"
                  type="password"
                  class="w-full px-4 py-3 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
                  placeholder="Минимум 8 символов"
                  required
                />
              </div>

              <div>
                <label class="block text-sm text-[var(--text-muted)] mb-2">Подтвердите пароль</label>
                <input
                  v-model="passwordForm.confirm"
                  type="password"
                  class="w-full px-4 py-3 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
                  placeholder="Повторите новый пароль"
                  required
                />
              </div>

              <div class="flex gap-3 pt-2">
                <UiButton
                  type="button"
                  variant="secondary"
                  class="flex-1"
                  @click="showPasswordModal = false"
                >
                  Отмена
                </UiButton>
                <UiButton type="submit" variant="primary" class="flex-1">
                  Сохранить
                </UiButton>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </UiCard>
</template>
