/**
 * useThemeDetect — кнопка переключения темы (солнце/луна).
 *
 * Определение и следование теме браузера — в плагине theme-system.client.ts
 * (работает на всех страницах, в т.ч. логин без layout).
 */

const STORAGE_KEY = 'pg19-theme'

function resetStorageToSystem(): void {
  try { localStorage.setItem(STORAGE_KEY, 'system') } catch { /* noop */ }
  document.cookie = `${STORAGE_KEY}=system;path=/;max-age=31536000;SameSite=Lax`
}

export function useThemeDetect() {
  const colorMode = useColorMode()

  const themeIcon = computed(() =>
    colorMode.value === 'dark' ? 'heroicons:sun' : 'heroicons:moon'
  )

  const themeLabel = computed(() =>
    colorMode.value === 'dark' ? 'Светлая тема' : 'Тёмная тема'
  )

  /** Ручное переключение; после этого при следующей загрузке снова будет тема по ОС. */
  function cycleTheme(): void {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
    setTimeout(resetStorageToSystem, 100)
  }

  return {
    themeIcon,
    themeLabel,
    cycleTheme
  }
}
