// =============================================================================
// Nuxt Config — Личный кабинет ПЖ19
// Документация: https://nuxt.com/docs/api/configuration/nuxt-config
// =============================================================================

export default defineNuxtConfig({
  // Дата совместимости — включает все изменения Nuxt до этой даты
  compatibilityDate: '2026-01-22',

  // Vue DevTools в браузере (только для разработки)
  devtools: { enabled: true },

  // ---------------------------------------------------------------------------
  // Функции Nuxt
  // ---------------------------------------------------------------------------
  features: {
    devLogs: false,      // Отключаем dev-логи в консоли браузера
    appManifest: false   // Отключаем PWA manifest (не нужен для ЛК)
  },

  // ---------------------------------------------------------------------------
  // Авто-импорт компонентов
  // ---------------------------------------------------------------------------
  // pathPrefix: false — компоненты регистрируются по имени файла
  // Пример: components/ui/UiButton.vue → <UiButton />
  components: [
    {
      path: '~/components',
      pathPrefix: false
    }
  ],

  // ---------------------------------------------------------------------------
  // Глобальные стили
  // ---------------------------------------------------------------------------
  css: [
    '~/assets/css/main.css'  // CSS-переменные темы, Tailwind, glass-эффекты
  ],

  // ---------------------------------------------------------------------------
  // Модули Nuxt
  // ---------------------------------------------------------------------------
  modules: [
    '@nuxtjs/tailwindcss',              // CSS-фреймворк
    '@nuxt/icon',                       // Иконки (Heroicons, Simple Icons)
    // Шрифт Outfit — self-hosted в public/fonts/, @font-face в main.css
    '@nuxtjs/color-mode',               // Переключение dark/light темы
    '@pinia/nuxt',                      // State management
    'pinia-plugin-persistedstate/nuxt', // Сохранение stores в localStorage (для кастомной авторизации!)
    '@nuxtjs/supabase'                  // Supabase клиент (только БД + Realtime, НЕ Auth)
  ],

  // ---------------------------------------------------------------------------
  // Supabase
  // ---------------------------------------------------------------------------
  // ВАЖНО: Supabase Auth НЕ используется — авторизация полностью кастомная
  // через таблицу auth_sessions и pinia-plugin-persistedstate
  supabase: {
    redirect: false,   // Отключаем редиректы Supabase Auth
    types: false,      // Отключаем генерацию типов (нет database.types.ts)
    serviceKey: ''     // Пустая строка — убирает deprecated warning
  },

  // ---------------------------------------------------------------------------
  // Runtime Config (переменные окружения)
  // ---------------------------------------------------------------------------
  runtimeConfig: {
    // Серверные переменные (недоступны на клиенте)
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',         // Токен Telegram бота
    telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '', // Секрет для проверки webhook от Telegram
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || '',       // Service role ключ Supabase
    openaiApiKey: process.env.OPENAI_API_KEY || '',                 // API ключ OpenAI (AI-бот в чате)

    // Публичные переменные (доступны на клиенте)
    public: {
      supabaseUrl: process.env.SUPABASE_URL || 'https://supabase.doka.team',
      supabaseKey: process.env.SUPABASE_KEY || '',              // Anon ключ Supabase
      telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || 'PG19CONNECTBOT',
      beelineCallNumber: '+7 960 459-69-45'                     // Номер для авторизации по звонку
    }
  },

  // ---------------------------------------------------------------------------
  // Цветовая тема
  // ---------------------------------------------------------------------------
  colorMode: {
    classSuffix: '',     // Без суффикса: класс "dark", а не "dark-mode"
    preference: 'dark',  // По умолчанию тёмная тема
    fallback: 'dark'     // Fallback если preference не определён
  },

  // ---------------------------------------------------------------------------
  // HTML Head (глобальные теги для всех страниц)
  // ---------------------------------------------------------------------------
  app: {
    head: {
      title: 'ПЖ19 — Личный кабинет',
      meta: [
        { name: 'description', content: 'Личный кабинет абонента ПЖ19. Баланс, счета, услуги, поддержка.' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  }
})
