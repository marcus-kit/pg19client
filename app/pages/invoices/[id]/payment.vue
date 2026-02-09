<script setup lang="ts">
/**
 * Страница счета на оплату — отображение изображения счета
 */
import type { Invoice } from '~/types/invoice'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const invoiceId = route.params.id as string

// =============================================================================
// STATE
// =============================================================================

const invoice = ref<Invoice | null>(null)
const isLoading = ref(true)

// =============================================================================
// LIFECYCLE
// =============================================================================

onMounted(async () => {
  // В реальном приложении здесь был бы запрос к API
  // Для моковых данных просто устанавливаем invoice
  isLoading.value = false
})

// =============================================================================
// METHODS
// =============================================================================

function goBack() {
  router.push('/invoices')
}

// Сохранить изображение как JPEG
function saveInvoiceAsJpeg(): void {
  const img = document.getElementById('invoice-image') as HTMLImageElement
  if (!img) return

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  ctx.drawImage(img, 0, 0)

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Счет_${invoiceId}.jpg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 'image/jpeg', 0.95)
}

// Скачать изображение
function downloadInvoiceJpeg(): void {
  const img = document.getElementById('invoice-image') as HTMLImageElement
  if (!img) return

  const a = document.createElement('a')
  a.href = img.src
  a.download = `Счет_${invoiceId}.jpg`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
</script>

<template>
  <div class="min-h-screen" style="background: var(--bg-primary);">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
      <!-- Кнопка "Назад" -->
      <button
        @click="goBack"
        class="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6"
      >
        <Icon name="heroicons:arrow-left" class="w-4 h-4" />
        Назад к счетам
      </button>

      <!-- Заголовок -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-[var(--text-primary)]">Счет на оплату</h1>
      </div>

      <!-- Контент -->
      <UiCard padding="lg">
        <div class="flex flex-col gap-6">
          <!-- Изображение счета -->
          <div class="flex items-center justify-center bg-[var(--glass-bg)] rounded-xl p-6" style="border: 1px solid var(--glass-border);">
            <img
              id="invoice-image"
              src="/Счет_101533.jpg"
              alt="Счет на оплату"
              class="max-w-full h-auto rounded-lg shadow-lg"
              style="display: block;"
            />
          </div>

          <!-- Кнопки действий -->
          <div class="flex flex-col sm:flex-row gap-3">
            <UiButton
              variant="secondary"
              @click="downloadInvoiceJpeg"
              class="w-full sm:flex-1"
            >
              Скачать JPEG
            </UiButton>
            <UiButton
              variant="secondary"
              @click="saveInvoiceAsJpeg"
              class="w-full sm:flex-1"
            >
              Сохранить как JPEG
            </UiButton>
            <UiButton
              variant="primary"
              @click="goBack"
              class="w-full sm:flex-1"
            >
              Закрыть
            </UiButton>
          </div>
        </div>
      </UiCard>
    </div>
  </div>
</template>
