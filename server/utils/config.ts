/**
 * Валидация runtime конфигурации при старте сервера.
 * Обязательных переменных нет: при отсутствии сервисов выводим предупреждения, приложение стартует.
 */

/** Токен бота: из runtimeConfig (NUXT_TELEGRAM_BOT_TOKEN) или из TELEGRAM_BOT_TOKEN — без префикса NUXT_ */
export function getTelegramBotToken(): string {
  const config = useRuntimeConfig()
  return (config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '').trim()
}

export function validateConfig() {
  const config = useRuntimeConfig()
  const warnings: string[] = []

  if (!config.public.telegramBotUsername) {
    warnings.push('TELEGRAM_BOT_USERNAME не задан: авторизация по Telegram и deeplink будут недоступны.')
  }
  if (!getTelegramBotToken()) {
    warnings.push('TELEGRAM_BOT_TOKEN не задан: вебхук и бот Telegram не будут работать.')
  }
  if (!config.public.supabaseUrl || !config.public.supabaseKey || !config.supabaseSecretKey) {
    warnings.push('Supabase не настроен: загрузка аватаров и вложений чата в Storage будет недоступна.')
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Конфигурация: некоторые переменные окружения не заданы:')
    warnings.forEach(w => console.warn(`  - ${w}`))
    console.warn('  См. .env.example и .env.production.example')
  } else {
    console.log('✅ Конфигурация проверена.')
  }
}
