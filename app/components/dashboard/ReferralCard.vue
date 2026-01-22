<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

const copySuccess = ref(false)

const copyCode = async () => {
  const code = authStore.referralProgram?.code
  if (!code) return

  try {
    await navigator.clipboard.writeText(code)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch {
    // Fallback for older browsers
    const input = document.createElement('input')
    input.value = code
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }
}
</script>

<template>
  <UCard class="border-accent/30 bg-gradient-to-r from-accent/10 to-primary/5">
    <div class="flex items-center gap-4">
      <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
        <Icon name="heroicons:gift" class="w-6 h-6 text-white" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-sm font-medium text-[var(--text-primary)]">Ваш промокод</span>
          <UBadge variant="success" size="sm">+300 ₽</UBadge>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xl font-bold text-[var(--text-primary)] tracking-wider">
            {{ authStore.referralProgram?.code || '...' }}
          </span>
          <button
            class="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            @click="copyCode"
          >
            <Icon
              :name="copySuccess ? 'heroicons:check' : 'heroicons:clipboard-document'"
              :class="['w-4 h-4', copySuccess ? 'text-accent' : 'text-[var(--text-muted)]']"
            />
          </button>
        </div>
      </div>
      <NuxtLink to="/profile" class="flex-shrink-0">
        <UButton size="sm" variant="secondary">
          Подробнее
        </UButton>
      </NuxtLink>
    </div>
  </UCard>
</template>
