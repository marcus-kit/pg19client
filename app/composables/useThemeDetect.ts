/**
 * useThemeDetect — автоопределение темы браузера
 *
 * - Определяет системную тему (prefers-color-scheme: dark / light)
 * - Слушает изменения в реальном времени через matchMedia
 * - Интегрируется с @nuxtjs/color-mode
 * - Предоставляет переключение: system → dark → light → system
 */
export function useThemeDetect() {
  const colorMode = useColorMode()

  /** Текущая системная тема браузера ('dark' | 'light') */
  const systemTheme = ref<'dark' | 'light'>('dark')

  /** Слушает ли сейчас изменения системной темы */
  const isSystemMode = computed(() => colorMode.preference === 'system')

  /** Итоговая применённая тема ('dark' | 'light') */
  const resolvedTheme = computed(() => colorMode.value as 'dark' | 'light')

  /** Текущий режим: 'system' | 'dark' | 'light' */
  const preference = computed(() => colorMode.preference)

  /** Иконка для текущего режима */
  const themeIcon = computed(() => {
    if (colorMode.preference === 'system') return 'heroicons:computer-desktop'
    return colorMode.value === 'dark' ? 'heroicons:sun' : 'heroicons:moon'
  })

  /** Подпись для текущего режима */
  const themeLabel = computed(() => {
    if (colorMode.preference === 'system') return 'Системная тема'
    return colorMode.value === 'dark' ? 'Светлая тема' : 'Тёмная тема'
  })

  /** Переключить: system → dark → light → system */
  function cycleTheme(): void {
    const order: Array<'system' | 'dark' | 'light'> = ['system', 'dark', 'light']
    const current = order.indexOf(colorMode.preference as typeof order[number])
    const next = order[(current + 1) % order.length]
    colorMode.preference = next
  }

  /** Установить конкретный режим */
  function setTheme(mode: 'system' | 'dark' | 'light'): void {
    colorMode.preference = mode
  }

  if (import.meta.client) {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    systemTheme.value = mql.matches ? 'dark' : 'light'

    const handler = (e: MediaQueryListEvent) => {
      systemTheme.value = e.matches ? 'dark' : 'light'
    }
    mql.addEventListener('change', handler)
    onScopeDispose(() => mql.removeEventListener('change', handler))
  }

  return {
    systemTheme,
    isSystemMode,
    resolvedTheme,
    preference,
    themeIcon,
    themeLabel,
    cycleTheme,
    setTheme
  }
}
