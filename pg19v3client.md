# PG19 Client Portal

**Личный кабинет абонента интернет-провайдера ПЖ19**

## Обзор проекта

PG19 Client Portal — это веб-приложение личного кабинета для абонентов провайдера ПЖ19. Позволяет управлять услугами, просматривать счета, общаться с поддержкой и участвовать в локальном сообществе.

### Технологический стек

| Категория | Технология |
|-----------|------------|
| Фреймворк | Nuxt 4 + Vue 3 |
| State Management | Pinia + pinia-plugin-persistedstate |
| Стилизация | Tailwind CSS + CSS Variables |
| Backend/BaaS | Supabase (Auth, Database, Realtime, Storage) |
| AI | OpenAI API (GPT-5-nano, text-embedding-3-small) |
| Карты | Yandex Maps API |
| Иконки | Iconify (@heroicons, simple-icons) |
| Rich Text | Tiptap |
| Маски ввода | iMask |

---

## Основные функции

### 1. Авторизация (`/login`)

Три способа входа в систему:

| Способ | Описание | Реализация |
|--------|----------|------------|
| **Telegram** | OAuth через Telegram Login Widget | `useTelegramLogin` composable |
| **Договор** | Номер договора + ФИО абонента | API `/api/auth/contract` |
| **Звонок** | Верификация через входящий звонок | Beeline API + Supabase Realtime |

### 2. Дашборд (`/dashboard`)

- **Баланс** — текущий баланс и прогноз дней до блокировки
- **Статус подключения** — тариф, адрес, состояние услуги
- **Новости** — последние объявления провайдера
- **Реферальная программа** — приглашение друзей с бонусами

### 3. Услуги (`/services`)

- Список подключённых услуг (subscriptions)
- Каталог доступных услуг
- Запрос на подключение создаёт тикет в поддержку

### 4. Счета (`/invoices`)

- История выставленных счетов
- Фильтрация: все / к оплате / оплаченные
- Открытие счёта во внешнем сервисе (`invoice.doka.team`)

### 5. Поддержка (`/support`)

Три режима работы:

| Режим | Описание |
|-------|----------|
| **Чат** | AI-бот с RAG на базе FAQ, эскалация к оператору |
| **Заявки** | Тикет-система с категориями и статусами |
| **FAQ** | Аккордеон с частыми вопросами |

### 6. Сообщество (`/community`)

IRC-стиль чат с иерархией комнат:

```
Город (city)
└── Район (district)
    └── Дом (building)
```

Функции:
- Realtime-сообщения через Supabase Realtime
- Ответы на сообщения (reply)
- Закрепление сообщений (pin)
- Модерация: mute, ban, delete, жалобы
- Индикатор набора текста
- Загрузка изображений

### 7. Профиль (`/profile`)

5 вкладок:

| Вкладка | Содержимое |
|---------|------------|
| Профиль | Аватар, достижения, реферальная программа |
| Персональные данные | ФИО, контакты, привязка Telegram |
| Договор | Информация о договоре и адресе |
| Уведомления | Настройки каналов и типов уведомлений |
| Безопасность | Активные сессии |

---

## Структура проекта

```
pg19v3client/
├── app/
│   ├── components/          # Vue компоненты
│   │   ├── chat/           # Виджет чата поддержки
│   │   ├── community/      # Компоненты сообщества
│   │   ├── connection/     # Ввод адреса/телефона
│   │   ├── dashboard/      # Карточки дашборда
│   │   ├── home/           # Лендинг (не используется)
│   │   ├── layout/         # Header, Footer
│   │   ├── lk/             # Навигация ЛК
│   │   ├── news/           # Модалка новостей
│   │   ├── profile/        # Секции профиля
│   │   └── ui/             # Базовые UI компоненты
│   │
│   ├── composables/         # Vue composables
│   │   ├── useChat.ts              # Чат поддержки
│   │   ├── useCommunityChat.ts     # Чат сообщества
│   │   ├── useCallVerification.ts  # Верификация звонком
│   │   ├── useTelegramLogin.ts     # Telegram OAuth
│   │   ├── useYandexGeocoder.ts    # Геокодер Яндекс
│   │   ├── useDadataSuggest.ts     # Подсказки адресов
│   │   ├── useNews.ts              # Новости
│   │   ├── useServices.ts          # Услуги
│   │   ├── useInvoices.ts          # Счета
│   │   ├── useTickets.ts           # Тикеты
│   │   ├── useFaq.ts               # FAQ
│   │   └── ...
│   │
│   ├── stores/              # Pinia stores
│   │   ├── auth.ts         # Авторизация, пользователь, аккаунт
│   │   └── chat.ts         # Состояние чата
│   │
│   ├── types/               # TypeScript типы
│   │   ├── community.ts    # Типы сообщества
│   │   ├── invoice.ts      # Типы счетов
│   │   ├── news.ts         # Типы новостей
│   │   ├── service.ts      # Типы услуг
│   │   └── ticket.ts       # Типы тикетов
│   │
│   ├── pages/               # Страницы (file-based routing)
│   │   ├── index.vue       # Редирект → dashboard/login
│   │   ├── login.vue       # Авторизация
│   │   ├── dashboard.vue   # Главная ЛК
│   │   ├── services.vue    # Услуги
│   │   ├── invoices.vue    # Счета
│   │   ├── profile.vue     # Профиль
│   │   ├── community.vue   # Сообщество
│   │   └── support/        # Поддержка
│   │       ├── index.vue   # Главная поддержки
│   │       └── [id].vue    # Детали тикета
│   │
│   ├── layouts/             # Layouts
│   │   ├── default.vue     # Основной (с хедером/футером)
│   │   └── guest.vue       # Для неавторизованных
│   │
│   ├── middleware/          # Route middleware
│   │   ├── auth.ts         # Проверка авторизации
│   │   └── admin.ts        # Проверка админ-прав
│   │
│   └── directives/          # Vue directives
│       └── click-outside.ts
│
├── server/
│   ├── api/                 # API endpoints (Nitro)
│   │   ├── auth/           # Авторизация
│   │   │   ├── contract.post.ts
│   │   │   ├── telegram.post.ts
│   │   │   ├── link-telegram.post.ts
│   │   │   └── call-verify/
│   │   │
│   │   ├── chat/           # Чат поддержки
│   │   │   ├── session.post.ts
│   │   │   ├── send.post.ts
│   │   │   ├── messages.get.ts
│   │   │   ├── bot/respond.post.ts
│   │   │   ├── escalate.post.ts
│   │   │   └── close.post.ts
│   │   │
│   │   ├── community/      # Чат сообщества
│   │   │   ├── rooms/
│   │   │   ├── messages/
│   │   │   ├── moderation/
│   │   │   └── upload/
│   │   │
│   │   ├── support/        # Тикет-система
│   │   │   └── tickets/
│   │   │
│   │   ├── user/           # Профиль пользователя
│   │   ├── services/       # Услуги
│   │   ├── invoices/       # Счета
│   │   ├── news/           # Новости
│   │   ├── content/        # CMS контент
│   │   ├── address/        # DaData подсказки
│   │   ├── yandex/         # Яндекс геокодер
│   │   ├── coverage/       # Проверка покрытия
│   │   └── callback/       # Заказ обратного звонка
│   │
│   ├── utils/               # Серверные утилиты
│   │   ├── supabase.ts     # Supabase клиент
│   │   ├── openai.ts       # OpenAI клиент + RAG
│   │   ├── rateLimit.ts    # Rate limiting
│   │   ├── cache.ts        # Кэширование
│   │   └── ...
│   │
│   └── plugins/             # Nitro plugins
│       ├── validate-config.ts
│       └── remove-manifest-preload.ts
│
├── plugins/                 # Nuxt plugins
│   └── directives.ts
│
├── public/                  # Статические файлы
│
├── types/                   # Глобальные типы
│   └── chat.ts
│
├── nuxt.config.ts          # Конфигурация Nuxt
├── tailwind.config.ts      # Конфигурация Tailwind
├── package.json
└── tsconfig.json
```

---

## Интеграции

### Supabase

| Функция | Использование |
|---------|---------------|
| Auth | Хранение сессий (через Telegram/Contract) |
| Database | PostgreSQL для всех данных |
| Realtime | Community chat, Call verification, Support chat |
| Storage | Аватары, изображения в чате |

### OpenAI (AI-бот поддержки)

- **Модель**: gpt-5-nano (для генерации ответов)
- **Embeddings**: text-embedding-3-small (1536 dimensions)
- **RAG**: Поиск релевантных FAQ по векторному сходству
- **Защита**: Prompt injection sanitization

### Yandex Maps

- Отображение карты для выбора адреса
- Геокодирование адресов
- Подсказки при вводе

### DaData

- Подсказки адресов при вводе
- Стандартизация адресов

### Telegram

- OAuth авторизация через Login Widget
- Привязка аккаунта к Telegram
- Уведомления (планируется)

### Beeline API

- Верификация через входящий звонок
- Определение номера звонящего

---

## Конфигурация

### Environment Variables

```bash
# Public (доступны на клиенте)
SUPABASE_URL=https://supabase.doka.team
SUPABASE_KEY=<anon_key>
TELEGRAM_BOT_USERNAME=PG19CONNECTBOT
YANDEX_MAPS_API_KEY=<key>
TWA_URL=https://pg19-tg.doka.team

# Private (только сервер)
SUPABASE_SERVICE_KEY=<service_role_key>
TELEGRAM_BOT_TOKEN=<bot_token>
DADATA_API_KEY=<key>
DADATA_SECRET_KEY=<secret>
OPENAI_API_KEY=<key>
BEELINE_API_TOKEN=<token>
```

### Запуск

```bash
# Установка зависимостей
pnpm install

# Разработка
pnpm dev

# Сборка
pnpm build

# Превью production
pnpm preview
```

---

## UI/UX

### Цветовая схема

- **Тёмная тема по умолчанию** (dark mode)
- CSS Variables для theming
- Glassmorphism эффекты

### UI компоненты

Кастомные компоненты в `app/components/ui/`:

| Компонент | Описание |
|-----------|----------|
| UButton | Кнопки с вариантами и loading state |
| UCard | Карточки с glassmorphism |
| UInput | Поля ввода с лейблами |
| USelect | Выпадающие списки |
| UToggle | Переключатели |
| UBadge | Бейджи со статусами |

### Иконки

- `@iconify-json/heroicons` — основные иконки
- `@iconify-json/simple-icons` — логотипы (Telegram и др.)

---

## Модели данных (ключевые)

### User (пользователь)

```typescript
interface User {
  id: string
  firstName: string
  lastName: string
  middleName: string
  phone: string
  email: string
  telegram: string
  telegramId: string | null
  vkId: string
  avatar: string | null
  birthDate: string | null
  nickname?: string | null
  role?: 'user' | 'admin' | 'moderator'
}
```

### Account (договор)

```typescript
interface Account {
  contractNumber: number
  balance: number           // в копейках
  status: 'active' | 'blocked'
  tariff: string
  address: string
  startDate: string
}
```

### CommunityMessage (сообщение в сообществе)

```typescript
interface CommunityMessage {
  id: string
  roomId: string
  userId: string
  content: string
  contentType: 'text' | 'image' | 'system'
  imageUrl: string | null
  isPinned: boolean
  isDeleted: boolean
  replyToId: string | null
  createdAt: string
  user?: CommunityUser
}
```

---

## Безопасность

- **Авторизация**: Middleware на защищённых маршрутах
- **Telegram**: Проверка hash подписи виджета
- **Rate Limiting**: На API endpoints
- **Prompt Injection**: Санитизация сообщений для AI-бота
- **CORS**: Настроен для production домена

---

## Связанные проекты

- **invoice.doka.team** — Сервис счетов
- **pg19-tg.doka.team** — Telegram Web App
- **supabase.doka.team** — Supabase API
- **studio.doka.team** — Supabase Studio
