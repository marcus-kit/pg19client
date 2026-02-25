<script setup lang="ts">
/**
 * Страница счетов — история выставленных счетов:
 * - Фильтрация: все / к оплате / оплаченные
 * - Клик по счёту открывает его на invoice.doka.team
 *
 * Статусы счетов:
 * - pending, sent, viewed — неоплаченные
 * - paid — оплаченный
 * - expired — просроченный
 */
import type { Invoice, InvoiceStatus } from '~/types/invoice'
import { invoiceStatusLabels, invoiceStatusColors, formatInvoicePeriod } from '~/types/invoice'
import { formatKopeks, formatDateShort } from '~/composables/useFormatters'
import { useInvoiceServices } from '~/composables/useInvoiceServices'

definePageMeta({
  middleware: 'auth'
})

// =============================================================================
// DATA — счета из API
// =============================================================================

const invoiceServices = useInvoiceServices()

const invoices = ref<Invoice[]>([])
const pending = ref(false)
const error = ref<string | null>(null)

async function loadInvoices() {
  pending.value = true
  error.value = null
  try {
    const data = await $fetch<{ invoices: Invoice[] }>('/api/invoices')
    invoices.value = data.invoices ?? []
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err.data?.message || 'Не удалось загрузить счета'
    invoices.value = []
  } finally {
    pending.value = false
  }
}

function refresh() {
  loadInvoices()
}

// =============================================================================
// STATE — фильтр
// =============================================================================

const filter = ref<'all' | 'unpaid' | 'paid'>('all')
const route = useRoute()
const router = useRouter()

// Открытый счет для показа деталей
const expandedInvoiceId = ref<string | null>(null)

// Модальное окно с составом услуг
const showServicesModal = ref(false)
const selectedInvoiceForServices = ref<Invoice | null>(null)

// Модальное окно счета на оплату
const showInvoiceModal = ref(false)
const selectedInvoiceId = ref<string | null>(null)

// Суммы оплаты для каждого счета
const paymentAmounts = ref<Record<string, number>>({})

onMounted(async () => {
  await loadInvoices()

  const filterParam = route.query.filter as string
  if (filterParam && ['all', 'unpaid', 'paid'].includes(filterParam)) {
    filter.value = filterParam as 'all' | 'unpaid' | 'paid'
  }

  const invoiceId = route.query.id as string
  if (invoiceId) {
    const invoice = invoices.value.find(inv => inv.id === invoiceId)
    if (invoice) {
      selectedInvoiceForServices.value = invoice
      showServicesModal.value = true
      nextTick(() => {
        const element = document.getElementById(`invoice-${invoiceId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
    }
  }

  invoices.value.forEach(invoice => {
    if (!unpaidStatuses.includes(invoice.status)) return
    if (!paymentAmounts.value[invoice.id]) {
      paymentAmounts.value[invoice.id] = invoice.amount / 100
    }
  })
})

// =============================================================================
// COMPUTED
// =============================================================================

// Отфильтрованный список счетов
const filteredInvoices = computed(() => {
  if (filter.value === 'unpaid') {
    return invoices.value.filter(inv => unpaidStatuses.includes(inv.status))
  }
  if (filter.value === 'paid') {
    return invoices.value.filter(inv => inv.status === 'paid')
  }
  return invoices.value
})

// Путь к изображению счета
const invoiceImageSrc = computed(() => {
  // Используем encodeURI для правильной обработки кириллицы в URL
  return encodeURI('/Счет_101533.jpg')
})

// =============================================================================
// CONSTANTS
// =============================================================================

// Статусы неоплаченных счетов
const unpaidStatuses = ['pending', 'sent', 'viewed', 'expired']

// Опции фильтра
const filters = [
  { value: 'all', label: 'Все' },
  { value: 'unpaid', label: 'К оплате' },
  { value: 'paid', label: 'Оплаченные' }
]

// =============================================================================
// METHODS
// =============================================================================

// Открыть модальное окно с составом услуг
function openServicesModal(invoice: Invoice, event: Event): void {
  event.stopPropagation()
  selectedInvoiceForServices.value = invoice
  showServicesModal.value = true
}

// Закрыть модальное окно с составом услуг
function closeServicesModal(): void {
  showServicesModal.value = false
  selectedInvoiceForServices.value = null
}

// Блокировать/разблокировать прокрутку body
function lockBodyScroll(lock: boolean): void {
  if (typeof document === 'undefined') return
  if (lock) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

// Обработчик прокрутки в модальном окне
function handleModalWheel(event: WheelEvent): void {
  const target = event.currentTarget as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target
  
  // Если прокрутка вниз и достигнут конец
  if (event.deltaY > 0 && scrollTop + clientHeight >= scrollHeight - 1) {
    event.preventDefault()
    event.stopPropagation()
  }
  // Если прокрутка вверх и достигнуто начало
  else if (event.deltaY < 0 && scrollTop <= 1) {
    event.preventDefault()
    event.stopPropagation()
  }
}

// Прокрутить к форме оплаты в модальном окне
function scrollToPaymentForm(): void {
  nextTick(() => {
    const paymentForm = document.getElementById('payment-form')
    if (paymentForm) {
      paymentForm.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Небольшая задержка для фокуса на инпут
      setTimeout(() => {
        const input = paymentForm.querySelector('input[type="number"]') as HTMLInputElement
        if (input) {
          input.focus()
        }
      }, 300)
    }
  })
}

// Открыть модальное окно счета на оплату
function openInvoiceModal(invoiceId: string, event?: Event): void {
  if (event) {
    event.stopPropagation()
    event.preventDefault()
  }
  
  // Закрываем модальное окно с услугами, если оно открыто
  if (showServicesModal.value) {
    showServicesModal.value = false
    selectedInvoiceForServices.value = null
  }
  
  // Открываем модальное окно счета на оплату
  selectedInvoiceId.value = invoiceId
  showInvoiceModal.value = true
}

// Закрыть модальное окно
function closeInvoiceModal(): void {
  showInvoiceModal.value = false
  selectedInvoiceId.value = null
}

// Отслеживание открытия/закрытия модальных окон для блокировки прокрутки
watch(showServicesModal, (isOpen) => {
  lockBodyScroll(isOpen)
})

watch(showInvoiceModal, (isOpen) => {
  lockBodyScroll(isOpen)
})

// Разблокировать прокрутку при размонтировании
onUnmounted(() => {
  lockBodyScroll(false)
})

// Обработчик ошибки загрузки изображения
function handleImageError(event: Event): void {
  const img = event.target as HTMLImageElement
  console.error('Ошибка загрузки изображения:', img.src)
  // Можно показать сообщение об ошибке или использовать fallback изображение
}

// Обработчик успешной загрузки изображения
function handleImageLoad(event: Event): void {
  console.log('Изображение успешно загружено')
}

// Сохранить изображение как JPEG
function saveInvoiceAsJpeg(): void {
  if (!selectedInvoiceId.value) return
  const img = document.getElementById(`invoice-image-${selectedInvoiceId.value}`) as HTMLImageElement
  if (!img) {
    console.error('Изображение не найдено')
    return
  }
  
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  ctx.drawImage(img, 0, 0)
  
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Счет_${selectedInvoiceId.value}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 'image/jpeg', 0.95)
}

// Скачать изображение
function downloadInvoiceJpeg(): void {
  if (!selectedInvoiceId.value) return
  const img = document.getElementById(`invoice-image-${selectedInvoiceId.value}`) as HTMLImageElement
  if (!img) return
  
  const link = document.createElement('a')
  link.href = img.src
  link.download = `Счет_${selectedInvoiceId.value}.jpg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Получить CSS-класс для бейджа статуса
function getStatusBadgeClass(status: InvoiceStatus): string {
  // Неоплаченные счета - красный фон
  const unpaidStatuses = ['pending', 'sent', 'viewed', 'expired']
  if (unpaidStatuses.includes(status)) {
    return 'bg-red-500/20 text-red-400'
  }
  
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-600/20 text-gray-400',
    primary: 'bg-primary/20 text-primary',
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-accent/20 text-accent',
    red: 'bg-red-500/20 text-red-400'
  }
  const color = invoiceStatusColors[status] as string
  return (color in colorMap ? colorMap[color] : colorMap.gray) as string
}
</script>

<template>
  <div class="space-y-6">
    <!-- =====================================================================
         PAGE HEADER
         ===================================================================== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-[var(--text-primary)]">Счета</h1>
        <p class="text-[var(--text-muted)] mt-1">История выставленных счетов</p>
      </div>
    </div>

    <!-- =====================================================================
         FILTERS — фильтр по статусу оплаты
         ===================================================================== -->
    <div class="flex gap-2">
      <button
        v-for="f in filters"
        :key="f.value"
        @click="filter = f.value as any"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        :class="filter === f.value
          ? 'bg-primary text-white'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'"
        :style="filter !== f.value ? 'background: var(--glass-bg);' : ''"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- =====================================================================
         LOADING — скелетон загрузки (отключен для моковых данных)
         ===================================================================== -->
    <div v-if="false" class="space-y-4">
      <UiCard v-for="i in 3" :key="i" class="animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-[var(--glass-bg)]"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-[var(--glass-bg)] rounded w-1/3"></div>
            <div class="h-3 bg-[var(--glass-bg)] rounded w-1/2"></div>
          </div>
        </div>
      </UiCard>
    </div>

    <!-- =====================================================================
         ERROR — состояние ошибки
         ===================================================================== -->
    <UiCard v-else-if="error">
      <UiErrorState
        title="Ошибка загрузки"
        description="Не удалось загрузить счета"
        @retry="refresh"
      />
    </UiCard>

    <!-- =====================================================================
         INVOICES LIST — список счетов
         ===================================================================== -->
    <div v-else class="space-y-4">
      <div
        v-for="invoice in filteredInvoices"
        :key="invoice.id"
        :id="`invoice-${invoice.id}`"
      >
        <UiCard hover class="cursor-pointer" @click="openServicesModal(invoice, $event)">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
                <Icon
                  :name="invoice.status === 'paid' ? 'heroicons:check-circle' : 'heroicons:document-text'"
                  class="w-6 h-6"
                  :class="invoice.status === 'paid' ? 'text-accent' : 'text-primary'"
                />
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs text-[var(--text-muted)]">{{ invoice.invoiceNumber }}</span>
                  <UiBadge :class="getStatusBadgeClass(invoice.status)" size="sm">
                    {{ invoiceStatusLabels[invoice.status] }}
                  </UiBadge>
                </div>
                <p class="font-medium text-[var(--text-primary)]">{{ formatInvoicePeriod(invoice) }}</p>
                <div class="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                  <span v-if="invoice.issuedAt">Выставлен: {{ formatDateShort(invoice.issuedAt) }}</span>
                  <span v-if="invoice.paidAt">Оплачен: {{ formatDateShort(invoice.paidAt) }}</span>
                  <span v-else-if="invoice.dueDate">Срок: {{ formatDateShort(invoice.dueDate) }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-lg font-bold text-[var(--text-primary)]">
                {{ formatKopeks(invoice.amount) }}
                <span class="text-sm font-normal text-[var(--text-muted)]">₽</span>
              </span>
              <Icon 
                name="heroicons:chevron-right" 
                class="w-5 h-5 text-[var(--text-muted)]" 
              />
            </div>
          </div>
        </UiCard>

        <!-- Выпадающее меню с составом услуг -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          leave-active-class="transition-all duration-300 ease-in"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[2000px]"
          leave-from-class="opacity-100 max-h-[2000px]"
          leave-to-class="opacity-0 max-h-0"
        >
          <UiCard v-if="expandedInvoiceId === invoice.id" class="mt-2 border-t-0 rounded-t-none">
            <div class="space-y-6">
              <h3 class="text-lg font-bold text-[var(--text-primary)] mb-4">Состав услуг:</h3>
              
              <div v-for="(address, idx) in invoiceDetailsData.addresses" :key="idx" class="space-y-4">
                <!-- Адрес -->
                <div class="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/5 border-l-4 border-primary">
                  <p class="text-sm font-semibold text-[var(--text-primary)] leading-relaxed">{{ address.address }}</p>
                </div>
                
                <!-- Услуги для адреса -->
                <div class="space-y-3 pl-2">
                  <div
                    v-for="(service, serviceIdx) in address.services"
                    :key="serviceIdx"
                    class="flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-[var(--glass-bg)] transition-colors"
                    :style="serviceIdx < address.services.length - 1 ? 'border-bottom: 1px solid var(--glass-border);' : ''"
                  >
                    <div class="flex-1 min-w-0 pr-4">
                      <p class="text-sm text-[var(--text-primary)] leading-relaxed">
                        {{ service.name }}
                      </p>
                    </div>
                    <div class="flex-shrink-0 text-right">
                      <span class="text-base font-bold text-[var(--text-primary)] whitespace-nowrap">
                        {{ formatKopeks(service.price) }} ₽
                      </span>
                    </div>
                  </div>
                  
                  <!-- Итого по адресу -->
                  <div class="flex items-center justify-between gap-4 pt-2 mt-2 border-t-2" style="border-color: var(--glass-border);">
                    <span class="text-sm font-semibold text-[var(--text-secondary)]">Итого по адресу:</span>
                    <span class="text-lg font-bold text-primary whitespace-nowrap">
                      {{ formatKopeks(address.services.reduce((sum, s) => sum + s.price, 0)) }} ₽
                    </span>
                  </div>
                </div>
                
                <!-- Разделитель между адресами -->
                <div v-if="idx < invoiceDetailsData.addresses.length - 1" class="my-6 border-t-2" style="border-color: var(--glass-border);"></div>
              </div>

              <div class="pt-4 border-t" style="border-color: var(--glass-border);">
                <div class="space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-[var(--text-muted)]">Сумма услуг в следующем месяце:</span>
                    <span class="text-base font-bold text-[var(--text-primary)]">
                      {{ formatKopeks(invoiceDetailsData.totalAmount) }} ₽
                    </span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-[var(--text-muted)]">Баланс счета:</span>
                    <span class="text-base font-bold text-[var(--text-primary)]">
                      {{ formatKopeks(invoiceDetailsData.balance) }} ₽
                    </span>
                  </div>
                  <div class="flex justify-between items-center pt-2 border-t" style="border-color: var(--glass-border);">
                    <span class="text-base font-bold text-[var(--text-primary)]">Итого к оплате:</span>
                    <span class="text-lg font-bold text-primary">
                      {{ formatKopeks(invoiceDetailsData.totalToPay) }} ₽
                    </span>
                  </div>
                </div>
              </div>

              <!-- Инпут и кнопка оплаты для неоплаченных счетов -->
              <div v-if="unpaidStatuses.includes(invoice.status)" class="pt-4 border-t" style="border-color: var(--glass-border);">
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Введите сумму, которую хотите оплатить
                    </label>
                    <input
                      v-model.number="paymentAmounts[invoice.id]"
                      type="number"
                      min="0"
                      step="0.01"
                      class="w-full px-4 py-3 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
                      placeholder="3095"
                      @click.stop
                    />
                  </div>
                  <UiButton
                    variant="primary"
                    block
                    @click="openInvoiceModal(invoice.id, $event)"
                  >
                    Счет на оплату
                  </UiButton>
                </div>
              </div>
            </div>
          </UiCard>
        </Transition>
      </div>

      <!-- Empty State -->
      <UiCard v-if="filteredInvoices.length === 0" padding="lg">
        <UiEmptyState
          icon="heroicons:document-text"
          title="Счетов не найдено"
        />
      </UiCard>
    </div>

    <!-- =====================================================================
         MODAL — модальное окно с составом услуг
         ===================================================================== -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showServicesModal && selectedInvoiceForServices"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style="background-color: rgba(0, 0, 0, 0.6);"
          @click.self="closeServicesModal"
        >
          <div class="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden" style="background: var(--bg-surface); border: 1px solid var(--glass-border); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
            <!-- Заголовок -->
            <div class="flex items-center justify-between p-6 border-b" style="border-color: var(--glass-border);">
              <div>
                <h2 class="text-xl font-bold text-[var(--text-primary)]">Состав услуг</h2>
                <p class="text-sm text-[var(--text-muted)] mt-1">{{ selectedInvoiceForServices.invoiceNumber }} • {{ formatInvoicePeriod(selectedInvoiceForServices) }}</p>
              </div>
              <button
                @click="closeServicesModal"
                class="p-2 rounded-lg hover:bg-[var(--glass-bg)] transition-colors"
              >
                <Icon name="heroicons:x-mark" class="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>

            <!-- Контентная область (scrollable) -->
            <div class="flex-1 overflow-y-auto p-6 custom-scrollbar" @wheel="handleModalWheel">
              <div class="space-y-6">
                <div v-for="(address, idx) in invoiceDetailsData.addresses" :key="idx" class="space-y-4">
                  <!-- Адрес -->
                  <div class="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/5 border-l-4 border-primary">
                    <div class="flex items-center gap-2 mb-1">
                      <Icon name="heroicons:map-pin" class="w-4 h-4 text-primary flex-shrink-0" />
                      <p class="text-sm font-semibold text-[var(--text-primary)] leading-relaxed">{{ address.address }}</p>
                    </div>
                  </div>
                  
                  <!-- Услуги для адреса -->
                  <div class="space-y-2 pl-4">
                    <div
                      v-for="(service, serviceIdx) in address.services"
                      :key="serviceIdx"
                      class="flex items-start justify-between gap-4 p-4 rounded-lg transition-all"
                      :style="serviceIdx < address.services.length - 1 ? 'background: var(--glass-bg); border-bottom: 1px solid var(--glass-border);' : 'background: var(--glass-bg);'"
                    >
                      <div class="flex items-start gap-3 flex-1 min-w-0">
                        <div class="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                          <Icon name="heroicons:check" class="w-3 h-3 text-primary" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm text-[var(--text-primary)] leading-relaxed">
                            {{ service.name }}
                          </p>
                        </div>
                      </div>
                      <div class="flex-shrink-0 text-right ml-4">
                        <span class="text-base font-bold text-[var(--text-primary)] whitespace-nowrap">
                          {{ formatKopeks(service.price) }} ₽
                        </span>
                      </div>
                    </div>
                    
                    <!-- Итого по адресу -->
                    <div class="flex items-center justify-between gap-4 p-4 mt-3 rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 border-2" style="border-color: var(--glass-border);">
                      <div class="flex items-center gap-2">
                        <Icon name="heroicons:calculator" class="w-5 h-5 text-primary" />
                        <span class="text-sm font-semibold text-[var(--text-primary)]">Итого по адресу:</span>
                      </div>
                      <span class="text-lg font-bold text-primary whitespace-nowrap">
                        {{ formatKopeks(address.services.reduce((sum, s) => sum + s.price, 0)) }} ₽
                      </span>
                    </div>
                  </div>
                  
                  <!-- Разделитель между адресами -->
                  <div v-if="idx < invoiceDetailsData.addresses.length - 1" class="my-6 border-t-2" style="border-color: var(--glass-border);"></div>
                </div>

                <!-- Итоговые суммы -->
                <div class="pt-6 mt-6 border-t-2" style="border-color: var(--glass-border);">
                  <div class="space-y-3">
                    <div class="flex justify-between items-center p-3 rounded-lg" style="background: var(--glass-bg);">
                      <div class="flex items-center gap-2">
                        <Icon name="heroicons:document-text" class="w-4 h-4 text-[var(--text-muted)]" />
                        <span class="text-sm text-[var(--text-muted)]">Сумма услуг:</span>
                      </div>
                      <span class="text-base font-semibold text-[var(--text-primary)]">
                        {{ formatKopeks(invoiceDetailsData.totalAmount) }} ₽
                      </span>
                    </div>
                    <div class="flex justify-between items-center p-3 rounded-lg" style="background: var(--glass-bg);">
                      <div class="flex items-center gap-2">
                        <Icon name="heroicons:wallet" class="w-4 h-4 text-[var(--text-muted)]" />
                        <span class="text-sm text-[var(--text-muted)]">Баланс счета:</span>
                      </div>
                      <span class="text-base font-semibold text-[var(--text-primary)]">
                        {{ formatKopeks(invoiceDetailsData.balance) }} ₽
                      </span>
                    </div>
                    <div class="flex justify-between items-center p-4 mt-2 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/5 border-2" style="border-color: var(--glass-border);">
                      <div class="flex items-center gap-2">
                        <Icon name="heroicons:currency-ruble" class="w-5 h-5 text-primary" />
                        <span class="text-base font-bold text-[var(--text-primary)]">Итого к оплате:</span>
                      </div>
                      <span class="text-xl font-bold text-primary">
                        {{ formatKopeks(invoiceDetailsData.totalToPay) }} ₽
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Закрепленный блок с инпутом и кнопкой для неоплаченных счетов -->
            <div id="payment-form" v-if="unpaidStatuses.includes(selectedInvoiceForServices.status)" class="p-6 border-t flex-shrink-0" style="border-color: var(--glass-border); background: var(--bg-surface);">
              <div class="flex flex-col sm:flex-row gap-4 items-end">
                <div class="flex-1 w-full sm:w-auto">
                  <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Введите сумму, которую хотите оплатить
                  </label>
                  <input
                    v-model.number="paymentAmounts[selectedInvoiceForServices.id]"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full px-5 py-4 rounded-xl text-lg font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/30 transition-all duration-200 shadow-lg"
                    style="background: var(--bg-surface); border: 2px solid var(--glass-border);"
                    placeholder="3095"
                  />
                </div>
                <UiButton
                  variant="primary"
                  class="w-full sm:w-auto sm:flex-shrink-0"
                  @click="openInvoiceModal(selectedInvoiceForServices.id, $event)"
                >
                  Счет на оплату
                </UiButton>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- =====================================================================
         MODAL — модальное окно счета на оплату
         ===================================================================== -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showInvoiceModal"
          class="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
          style="background-color: rgba(0, 0, 0, 0.6);"
          @click.self="closeInvoiceModal"
        >
          <div class="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden" style="background: var(--bg-surface); border: 1px solid var(--glass-border); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
            <!-- Заголовок -->
            <div class="flex items-center justify-between p-6 border-b" style="border-color: var(--glass-border);">
              <h2 class="text-xl font-bold text-[var(--text-primary)]">Счет на оплату</h2>
              <button
                @click="closeInvoiceModal"
                class="p-2 rounded-lg hover:bg-[var(--glass-bg)] transition-colors"
              >
                <Icon name="heroicons:x-mark" class="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>

            <!-- Контентная область (scrollable) -->
            <div class="flex-1 overflow-y-auto p-6 flex items-center justify-center min-h-[400px]" @wheel="handleModalWheel">
              <img
                :id="`invoice-image-${selectedInvoiceId}`"
                :src="`/Счет_101533.jpg?t=${Date.now()}`"
                alt="Счет на оплату"
                class="max-w-full h-auto rounded-lg shadow-lg"
                style="display: block;"
                @error="(e) => console.error('Ошибка загрузки изображения:', e)"
                @load="() => console.log('Изображение загружено успешно')"
              />
            </div>

            <!-- Кнопки -->
            <div class="flex flex-col sm:flex-row gap-3 p-6 border-t" style="border-color: var(--glass-border);">
              <UiButton
                variant="secondary"
                @click="saveInvoiceAsJpeg"
                class="w-full sm:flex-1"
              >
                Сохранить как JPEG
              </UiButton>
              <UiButton
                variant="primary"
                @click="closeInvoiceModal"
                class="w-full sm:flex-1"
              >
                Закрыть
              </UiButton>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Кастомный скроллбар для модального окна */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) var(--bg-surface);
}

/* Для WebKit браузеров (Chrome, Safari, Edge) */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: var(--bg-surface);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  border: 2px solid var(--bg-surface);
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
}
</style>
