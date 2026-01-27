<script setup lang="ts">
/**
 * Speedometer — спидометр для отображения скорости интернета
 * Рисует gauge с текущим значением скорости
 */

// =============================================================================
// PROPS
// =============================================================================

const props = defineProps<{
  value: number // Текущее значение скорости (Мбит/с)
  max: number // Максимальное значение на шкале
  label: string // Подпись (Download/Upload)
  color?: string // Цвет спидометра
  size?: number // Размер в пикселях
}>()

// =============================================================================
// STATE
// =============================================================================

const canvasRef = ref<HTMLCanvasElement>()
const displayValue = ref(0) // Анимированное значение для плавного отображения

// =============================================================================
// COMPUTED
// =============================================================================

const maxValue = computed(() => props.max || 1000)
const currentColor = computed(() => props.color || '#6060AA')
const canvasSize = computed(() => props.size || 200)

// Нормализованное значение (0-1)
const normalizedValue = computed(() => Math.min(props.value / maxValue.value, 1))

// =============================================================================
// METHODS
// =============================================================================

// Рисование спидометра
function drawSpeedometer(): void {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const size = canvasSize.value
  const dp = window.devicePixelRatio || 1
  const cw = size * dp
  const ch = size * dp

  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw
    canvas.height = ch
  }

  ctx.clearRect(0, 0, cw, ch)
  ctx.scale(dp, dp)

  const centerX = size / 2
  const centerY = size - 5
  const radius = size / 2.1
  const startAngle = -Math.PI * 1.1
  const endAngle = Math.PI * 0.1

  // Фоновая дуга
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, startAngle, endAngle)
  ctx.strokeStyle = '#80808040'
  ctx.lineWidth = 12
  ctx.stroke()

  // Цветная дуга (текущее значение)
  const currentAngle = startAngle + (endAngle - startAngle) * normalizedValue.value
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, startAngle, currentAngle)
  ctx.strokeStyle = currentColor.value
  ctx.lineWidth = 12
  ctx.stroke()

  // Деления и метки
  const labels = [0, 100, 250, 500, 750, 1000]
  labels.forEach((label, index) => {
    const ratio = label / maxValue.value
    const angle = startAngle + (endAngle - startAngle) * ratio
    
    // Деление
    const tickLength = label % 250 === 0 ? 10 : 6
    const x1 = centerX + Math.cos(angle) * (radius - tickLength)
    const y1 = centerY + Math.sin(angle) * (radius - tickLength)
    const x2 = centerX + Math.cos(angle) * radius
    const y2 = centerY + Math.sin(angle) * radius
    
    ctx.strokeStyle = '#4a4d5e'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    
    // Текст метки
    if (label <= maxValue.value) {
      const labelDist = radius + 25
      const labelX = centerX + Math.cos(angle) * labelDist
      const labelY = centerY + Math.sin(angle) * labelDist
      
      ctx.fillStyle = '#C0C0C0'
      ctx.font = (label >= 100 ? 'bold ' : '') + '10px Roboto, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label.toString(), labelX, labelY)
    }
  })

  // Текст значения
  ctx.fillStyle = 'var(--text-primary)'
  ctx.font = 'bold 24px Roboto, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(displayValue.value.toFixed(2), centerX, centerY - 10)
  
  // Единица измерения
  ctx.fillStyle = 'var(--text-muted)'
  ctx.font = '12px Roboto, sans-serif'
  ctx.fillText('Мбит/с', centerX, centerY + 15)
}

// Анимация значения
function animateValue(): void {
  // Проверка на наличие браузерного окружения
  if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') {
    displayValue.value = props.value
    drawSpeedometer()
    return
  }

  const target = props.value
  const start = displayValue.value
  const duration = 1000 // 1 секунда
  const startTime = performance.now()

  function update(currentTime: number): void {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // Easing функция для плавной анимации
    const easeOut = 1 - Math.pow(1 - progress, 3)
    displayValue.value = start + (target - start) * easeOut
    
    drawSpeedometer()
    
    if (progress < 1) {
      requestAnimationFrame(update)
    } else {
      displayValue.value = target
      drawSpeedometer()
    }
  }
  
  requestAnimationFrame(update)
}

// =============================================================================
// WATCHERS
// =============================================================================

watch(() => props.value, (newValue) => {
  animateValue()
}, { immediate: true })

// =============================================================================
// LIFECYCLE
// =============================================================================

onMounted(() => {
  // Проверка на наличие браузерного окружения
  if (typeof window === 'undefined') return

  displayValue.value = props.value
  drawSpeedometer()
  
  // Перерисовка при изменении размера
  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => {
      drawSpeedometer()
    })
    
    if (canvasRef.value) {
      resizeObserver.observe(canvasRef.value)
    }
    
    onUnmounted(() => {
      resizeObserver.disconnect()
    })
  }
})
</script>

<template>
  <div class="flex flex-col items-center" style="padding: 15px; overflow: visible;">
    <div class="relative" :style="{ width: `${canvasSize + 50}px`, height: `${canvasSize + 50}px`, overflow: 'visible' }">
      <canvas
        ref="canvasRef"
        :style="{ width: `${canvasSize}px`, height: `${canvasSize}px`, display: 'block', margin: '25px auto' }"
      />
    </div>
    <p class="text-sm font-medium text-[var(--text-muted)] mt-1">{{ label }}</p>
  </div>
</template>
