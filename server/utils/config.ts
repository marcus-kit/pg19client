/**
 * Валидация runtime конфигурации при старте сервера.
 * Supabase (URL, ключи) — опционально; нужен только для загрузки аватаров и вложений чата в Storage.
 */
export function validateConfig() {
  const config = useRuntimeConfig()
  const errors: string[] = []

  if (!config.public.telegramBotUsername) {
    errors.push('TELEGRAM_BOT_USERNAME is not set')
  }
  if (!config.telegramBotToken) {
    errors.push('NUXT_TELEGRAM_BOT_TOKEN is not set')
  }

  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:')
    errors.forEach(err => console.error(`  - ${err}`))
    throw new Error('Missing required environment variables. Check .env.example for reference.')
  }

  console.log('✅ Configuration validated successfully')
  if (!config.public.supabaseUrl || !config.public.supabaseKey || !config.supabaseSecretKey) {
    console.warn('⚠️ Supabase не настроен: загрузка аватаров и вложений чата в Storage будет недоступна.')
  }
}
