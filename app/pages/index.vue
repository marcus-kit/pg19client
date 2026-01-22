<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth'
})

const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  // Middleware handles most redirects, this is a fallback
  if (!authStore.isAuthenticated) {
    router.replace('/login')
  } else {
    router.replace('/dashboard')
  }
})
</script>

<template>
  <div />
</template>
