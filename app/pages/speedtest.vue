<script setup lang="ts">
/**
 * Страница проверки скорости интернета
 * Использует прокси-эндпоинты для тестирования скорости
 */

definePageMeta({
  middleware: 'auth'
})

// =============================================================================
// TYPES
// =============================================================================

type TestState = 'idle' | 'ping' | 'download' | 'upload' | 'completed' | 'error'

interface TestResults {
  ip?: string
  ping?: number
  jitter?: number
  download?: number // Mbps
  upload?: number // Mbps
  testId?: string
}

// =============================================================================
// STATE
// =============================================================================

const testState = ref<TestState>('idle')
const results = ref<TestResults>({})
const error = ref<string | null>(null)
const progress = ref(0)

// Текущие значения для спидометров (обновляются в реальном времени)
const currentDownload = ref(0)
const currentUpload = ref(0)

// =============================================================================
// METHODS
// =============================================================================

// Получить IP адрес
async function getIP(): Promise<string | null> {
  try {
    const data = await $fetch<{ processedString: string }>('/api/speedtest/getip')
    return data.processedString || null
  } catch (err) {
    console.error('Failed to get IP:', err)
    return null
  }
}

// Тест ping (несколько измерений для расчета jitter)
async function testPing(iterations: number = 5): Promise<{ ping: number; jitter: number }> {
  const pings: number[] = []
  
  for (let i = 0; i < iterations; i++) {
    try {
      const startTime = performance.now()
      await $fetch('/api/speedtest/ping')
      const endTime = performance.now()
      pings.push(endTime - startTime)
      
      // Небольшая задержка между ping'ами
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (err) {
      console.error('Ping test failed:', err)
      pings.push(0)
    }
  }
  
  // Убираем нули и вычисляем средний ping
  const validPings = pings.filter(p => p > 0)
  const avgPing = validPings.length > 0 
    ? validPings.reduce((a, b) => a + b, 0) / validPings.length 
    : 0
  
  // Вычисляем jitter (среднее отклонение от среднего)
  const jitter = validPings.length > 1
    ? validPings.reduce((sum, ping) => sum + Math.abs(ping - avgPing), 0) / validPings.length
    : 0
  
  return { ping: Math.round(avgPing), jitter: Math.round(jitter * 100) / 100 }
}

// Тест download скорости
async function testDownload(): Promise<number> {
  try {
    // Делаем тест "по времени", как в оригинальном speedtest (дольше и точнее)
    const durationMs = 8000
    const size = 5_000_000 // 5MB
    const speeds: number[] = []

    const started = performance.now()
    while (performance.now() - started < durationMs) {
      const data = await $fetch<{ speedMbps: number }>(`/api/speedtest/download?size=${size}`)
      speeds.push(data.speedMbps)
      // Обновляем текущее значение для спидометра
      currentDownload.value = data.speedMbps
      // прогресс 30 → 60
      const t = Math.min((performance.now() - started) / durationMs, 1)
      progress.value = 30 + Math.round(t * 30)
    }

    const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0
    currentDownload.value = avgSpeed
    return avgSpeed
  } catch (err) {
    console.error('Download test failed:', err)
    throw err
  }
}

// Тест upload скорости
async function testUpload(): Promise<number> {
  try {
    const durationMs = 8000
    const size = 500_000 // 500KB
    const speeds: number[] = []
    const testData = 'a'.repeat(size)

    const started = performance.now()
    while (performance.now() - started < durationMs) {
      const data = await $fetch<{ speedMbps: number }>('/api/speedtest/upload', {
        method: 'POST',
        body: { data: testData }
      })
      speeds.push(data.speedMbps)
      // Обновляем текущее значение для спидометра
      currentUpload.value = data.speedMbps
      // прогресс 60 → 90
      const t = Math.min((performance.now() - started) / durationMs, 1)
      progress.value = 60 + Math.round(t * 30)
    }

    const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0
    currentUpload.value = avgSpeed
    return avgSpeed
  } catch (err) {
    console.error('Upload test failed:', err)
    throw err
  }
}

async function sendTelemetry(): Promise<string | null> {
  try {
    const payload = {
      dl: results.value.download ?? null,
      ul: results.value.upload ?? null,
      ping: results.value.ping ?? null,
      jitter: results.value.jitter ?? null,
      ispinfo: { processedString: results.value.ip || '' },
      extra: '',
      log: ''
    }
    const res = await $fetch<{ testId: string | null }>('/api/speedtest/telemetry', {
      method: 'POST',
      body: payload
    })
    return res.testId
  } catch (e) {
    console.warn('Telemetry failed:', e)
    return null
  }
}

// Запустить полный тест
async function startTest(): Promise<void> {
  testState.value = 'ping'
  error.value = null
  results.value = {}
  progress.value = 0
  currentDownload.value = 0
  currentUpload.value = 0
  
  try {
    // 1. Получаем IP (10%)
    const ip = await getIP()
    results.value.ip = ip || undefined
    progress.value = 10
    
    // 2. Тест ping (20%)
    testState.value = 'ping'
    const pingResults = await testPing()
    results.value.ping = pingResults.ping
    results.value.jitter = pingResults.jitter
    progress.value = 30
    
    // 3. Тест download (40%)
    testState.value = 'download'
    currentDownload.value = 0 // Сбрасываем перед началом
    const downloadSpeed = await testDownload()
    results.value.download = Math.round(downloadSpeed * 100) / 100
    currentDownload.value = results.value.download
    progress.value = 60
    
    // 4. Тест upload (30%)
    testState.value = 'upload'
    currentUpload.value = 0 // Сбрасываем перед началом
    const uploadSpeed = await testUpload()
    results.value.upload = Math.round(uploadSpeed * 100) / 100
    currentUpload.value = results.value.upload
    progress.value = 95

    // 5. Telemetry → Test ID
    const testId = await sendTelemetry()
    if (testId) results.value.testId = testId
    progress.value = 100
    
    // Завершение
    testState.value = 'completed'
  } catch (err: any) {
    testState.value = 'error'
    error.value = err.message || 'Произошла ошибка при тестировании'
    console.error('Speed test error:', err)
  }
}

// Сбросить результаты
function resetTest(): void {
  testState.value = 'idle'
  results.value = {}
  error.value = null
  progress.value = 0
  currentDownload.value = 0
  currentUpload.value = 0
}

// =============================================================================
// COMPUTED
// =============================================================================

const isRunning = computed(() => ['ping', 'download', 'upload'].includes(testState.value))
const canStart = computed(() => testState.value === 'idle' || testState.value === 'completed' || testState.value === 'error')

// Определение мобильной версии
const isMobile = ref(false)
const windowWidth = ref(0)

// Адаптивный размер спидометра на основе ширины экрана
const speedometerSize = computed(() => {
  if (typeof window === 'undefined' || windowWidth.value === 0) {
    return 200 // Значение по умолчанию для SSR
  }
  
  // Вычисляем размер на основе ширины экрана
  // Минимум 120px, максимум 250px
  // На мобильных (до 640px): 120-160px
  // На планшетах (640-1024px): 160-200px
  // На десктопе (1024px+): 200-250px
  const width = windowWidth.value
  
  if (width < 640) {
    // Мобильные: 120-160px в зависимости от ширины
    return Math.max(120, Math.min(160, width * 0.25))
  } else if (width < 1024) {
    // Планшеты: 160-200px
    return Math.max(160, Math.min(200, width * 0.2))
  } else {
    // Десктоп: 200-250px
    return Math.max(200, Math.min(250, width * 0.15))
  }
})

const currentTestLabel = computed(() => {
  switch (testState.value) {
    case 'ping': return 'Измерение пинга...'
    case 'download': return 'Тест загрузки...'
    case 'upload': return 'Тест выгрузки...'
    case 'completed': return 'Тест завершен'
    case 'error': return 'Ошибка'
    default: return 'Готов к тестированию'
  }
})

// Функция для определения мобильной версии и обновления ширины
function checkMobile(): void {
  if (typeof window !== 'undefined') {
    windowWidth.value = window.innerWidth
    isMobile.value = window.innerWidth < 768
  }
}

// =============================================================================
// LIFECYCLE
// =============================================================================

onMounted(() => {
  checkMobile()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', checkMobile)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', checkMobile)
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- =====================================================================
         PAGE HEADER
         ===================================================================== -->
    <div>
      <h1 class="text-2xl font-bold text-[var(--text-primary)]">Проверка скорости интернета</h1>
      <p class="text-[var(--text-muted)] mt-1">Тестирование скорости подключения</p>
    </div>

    <!-- =====================================================================
         MAIN TEST CARD
         ===================================================================== -->
    <UiCard>
      <div class="space-y-6">
        <!-- Progress Bar -->
        <div v-if="isRunning || testState === 'completed'" class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-[var(--text-primary)] font-medium">{{  currentTestLabel }}</span>
            <span class="text-[var(--text-muted)]">{{ progress }}%</span>
          </div>
          <div class="relative h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-white/10">
            <div
              class="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-300"
              :style="{ width: `${progress}%` }"
            />
          </div>
        </div>

        <!-- Speedometers - показываются всегда -->
        <div class="flex flex-row items-center justify-center gap-3 md:gap-10 py-2 md:py-4 overflow-visible">
          <!-- Download Speedometer -->
          <div class="flex justify-center overflow-visible flex-1 md:flex-none">
            <Speedometer
              :value="testState === 'download' ? currentDownload : (results.download || 0)"
              :max="1000"
              label="Загрузка"
              color="#4CAF50"
              :size="speedometerSize"
            />
          </div>

          <!-- Upload Speedometer -->
          <div class="flex justify-center overflow-visible flex-1 md:flex-none">
            <Speedometer
              :value="testState === 'upload' ? currentUpload : (results.upload || 0)"
              :max="1000"
              label="Выгрузка"
              color="#FF9800"
              :size="speedometerSize"
            />
          </div>
        </div>

        <!-- Results Details - IP и Ping показываются после начала теста -->
        <div v-if="isRunning || testState === 'completed'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- IP Address -->
          <div v-if="results.ip" class="p-4 rounded-lg" style="background: var(--glass-bg);">
            <div class="flex items-center gap-2 mb-1">
              <Icon name="heroicons:globe-alt" class="w-5 h-5 text-primary" />
              <span class="text-sm font-medium text-[var(--text-muted)]">IP адрес</span>
            </div>
            <p class="text-lg font-bold text-[var(--text-primary)]">{{ results.ip }}</p>
          </div>

          <!-- Ping -->
          <div v-if="results.ping !== undefined" class="p-4 rounded-lg" style="background: var(--glass-bg);">
            <div class="flex items-center gap-2 mb-1">
              <Icon name="heroicons:signal" class="w-5 h-5 text-blue-500" />
              <span class="text-sm font-medium text-[var(--text-muted)]">Пинг</span>
            </div>
            <p class="text-lg font-bold text-[var(--text-primary)]">{{ results.ping }} <span class="text-sm font-normal text-[var(--text-muted)]">мс</span></p>
            <p v-if="results.jitter !== undefined" class="text-xs text-[var(--text-muted)] mt-1">Джиттер: {{ results.jitter }} мс</p>
          </div>
        </div>

        <!-- Test ID - показывается только после завершения -->
        <div v-if="testState === 'completed' && results.testId" class="p-4 rounded-lg" style="background: var(--glass-bg);">
          <div class="flex items-center gap-2 mb-1">
            <Icon name="heroicons:identification" class="w-5 h-5 text-primary" />
            <span class="text-sm font-medium text-[var(--text-muted)]">Test ID</span>
          </div>
          <p class="text-lg font-bold text-[var(--text-primary)]">{{ results.testId }}</p>
          <p class="text-xs text-[var(--text-muted)] mt-1">ID создаётся сервисом телеметрии SpeedTest.</p>
        </div>

        <!-- Error Message -->
        <div v-if="testState === 'error' && error" class="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <div class="flex items-center gap-2">
            <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-red-500" />
            <p class="text-sm text-red-400">{{ error }}</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3">
          <UiButton
            v-if="testState === 'idle' || testState === 'error'"
            @click="startTest"
            :disabled="isRunning"
            variant="primary"
            class="flex-1"
          >
            <Icon name="heroicons:play" class="w-5 h-5 mr-2" />
            Начать тест
          </UiButton>
          <UiButton
            v-if="testState === 'completed'"
            @click="startTest"
            variant="primary"
            class="flex-1"
          >
            <Icon name="heroicons:arrow-path" class="w-5 h-5 mr-2" />
            Запустить снова
          </UiButton>
          <UiButton
            v-if="testState === 'completed' || testState === 'error'"
            @click="resetTest"
            variant="secondary"
          >
            <Icon name="heroicons:arrow-path" class="w-5 h-5" />
          </UiButton>
        </div>
      </div>
    </UiCard>

    <!-- =====================================================================
         INFO CARD
         ===================================================================== -->
    <UiCard>
      <div class="flex items-start gap-3">
        <Icon name="heroicons:information-circle" class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div class="space-y-2">
          <h3 class="font-semibold text-[var(--text-primary)]">О проверке скорости</h3>
          <p class="text-sm text-[var(--text-muted)]">
            Тест измеряет скорость вашего интернет-соединения: входящую (download), исходящую (upload), 
            пинг (latency) и джиттер (jitter). Результаты помогут оценить качество подключения.
          </p>
          <p class="text-xs text-[var(--text-muted)]">
            Для получения точных результатов рекомендуется закрыть другие приложения, использующие интернет.
          </p>
        </div>
      </div>
    </UiCard>
  </div>
</template>
