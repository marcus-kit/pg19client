/**
 * Плагин: синхронизация темы сайта с темой браузера (prefers-color-scheme).
 *
 * 1. При загрузке — применяем тему по ОС и пишем в storage 'system' для следующих загрузок.
 * 2. Подписка на смену темы в браузере — работает на ВСЕХ страницах (в т.ч. логин без layout).
 *
 * Inline-скрипт @nuxtjs/color-mode в <head> не слушает смену темы, только читает при загрузке.
 */

const STORAGE_KEY = 'pg19-theme'

function applySystemTheme(): void {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const colorMode = useColorMode()
  colorMode.preference = dark ? 'dark' : 'light'
  try {
    localStorage.setItem(STORAGE_KEY, 'system')
  } catch { /* noop */ }
  document.cookie = `${STORAGE_KEY}=system;path=/;max-age=31536000;SameSite=Lax`
}

export default defineNuxtPlugin(() => {
  applySystemTheme()

  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  mql.addEventListener('change', () => {
    applySystemTheme()
  })
})
