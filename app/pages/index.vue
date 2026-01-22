<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const userStore = useUserStore()
const router = useRouter()

onMounted(() => {
  // Middleware handles most redirects, this is a fallback
  if (!userStore.isAuthenticated) {
    router.replace('/login')
  } else {
    router.replace('/dashboard')
  }
})
</script>

<template>
  <div />
</template>
