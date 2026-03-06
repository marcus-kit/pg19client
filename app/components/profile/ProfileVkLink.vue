<script setup lang="ts">
const userStore = useUserStore()

const isLoading = ref(false)
const error = ref<string | null>(null)
const code = ref<string | null>(null)
const expiresAt = ref<string | null>(null)

const isLinked = computed(() => !!userStore.user?.vkId)

const hasCode = computed(() => !!code.value)

const vkDialogUrl = computed(() => {
  // Ожидается, что вы настроите VK_GROUP_SCREEN_NAME или VK_GROUP_ID в .env при необходимости
  const config = useRuntimeConfig()
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

async function fetchCode(): Promise<void> {
  error.value = null
  isLoading.value = true
  try {
    const res = await $fetch<{
      code: string
      expiresAt: string
      expiresInSeconds: number
    }>('/api/auth/vk/link-code', {
      method: 'POST'
    })

    code.value = res.code
    expiresAt.value = res.expiresAt
  } catch (e: any) {
    const message = e?.data?.message || e?.message || 'Не удалось получить код привязки VK.'
    error.value = message
  } finally {
    isLoading.value = false
  }
}

async function unlink(): Promise<void> {
  error.value = null
  isLoading.value = true
  try {
    await $fetch('/api/auth/vk/unlink', {
      method: 'POST'
    })
    userStore.updateUser({
      vkId: ''
    })
    code.value = null
    expiresAt.value = null
  } catch (e: any) {
    const message = e?.data?.message || e?.message || 'Не удалось отвязать VK.'
    error.value = message
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UiCard>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-[var(--text-primary)]">VK</h2>
      <UiBadge v-if="isLinked" variant="success" size="sm">
        <Icon name="heroicons:check" class="w-3 h-3 mr-1" />
        Привязан
      </UiBadge>
    </div>

    <!-- VK привязан -->
    <div v-if="isLinked" class="space-y-4">
      <div class="flex items-center gap-4">
        <div class="p-3 rounded-xl bg-[#2787F5]/10">
          <Icon name="simple-icons:vk" class="w-8 h-8 text-[#2787F5]" />
        </div>
        <div>
          <p class="text-[var(--text-primary)] font-medium">
            VK ID привязан
          </p>
          <p class="text-sm text-[var(--text-muted)]">
            Используется для связи вашего профиля с аккаунтом VK.
          </p>
        </div>
      </div>

      <UiButton
        variant="secondary"
        size="sm"
        :loading="isLoading"
        @click="unlink"
      >
        <Icon name="heroicons:link-slash" class="w-4 h-4 mr-1" />
        Отвязать VK
      </UiButton>
    </div>

    <!-- VK не привязан -->
    <div v-else class="space-y-4">
      <p class="text-sm text-[var(--text-muted)]">
        Привяжите VK, чтобы связать ваш личный кабинет с аккаунтом VK. Для этого:
      </p>

      <ol class="text-sm text-[var(--text-muted)] space-y-1 list-decimal list-inside">
        <li>Нажмите кнопку «Получить код».</li>
        <li>Откройте диалог с нашим сообществом VK.</li>
        <li>Отправьте полученный код одним сообщением.</li>
      </ol>

      <div class="space-y-3">
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <UiButton
            variant="primary"
            :loading="isLoading"
            @click="fetchCode"
          >
            <Icon name="simple-icons:vk" class="w-5 h-5 mr-2" />
            {{ hasCode ? 'Обновить код' : 'Получить код' }}
          </UiButton>

          <a
            v-if="vkDialogUrl"
            :href="vkDialogUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80"
          >
            <Icon name="simple-icons:vk" class="w-4 h-4" />
            Открыть диалог VK
          </a>
        </div>

        <div v-if="hasCode" class="p-3 rounded-lg border text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2" style="border-color: var(--glass-border); background: var(--glass-bg);">
          <div>
            <p class="text-xs text-[var(--text-muted)] mb-0.5">
              Код для отправки в сообщения группы
            </p>
            <p class="font-mono text-base text-[var(--text-primary)] tracking-wider">
              {{ code }}
            </p>
          </div>
          <div class="text-xs text-[var(--text-muted)] text-right sm:text-left">
            <span v-if="expiresAt">
              Действителен до
              {{ new Date(expiresAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }}
            </span>
          </div>
        </div>
      </div>

      <div class="p-3 rounded-lg text-xs text-[var(--text-muted)]" style="background: var(--glass-bg);">
        <div class="flex items-start gap-2">
          <Icon name="heroicons:information-circle" class="w-4 h-4 mt-0.5" />
          <p>
            Код действует ограниченное время и может быть использован только один раз. Если время истекло или вы
            отправили код с ошибкой, просто запросите новый код здесь.
          </p>
        </div>
      </div>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-400">
      {{ error }}
    </p>
  </UiCard>
</template>

