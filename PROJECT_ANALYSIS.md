# Анализ структуры проекта pg19client

## Дерево файлов

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Корневой layout (язык, тема)
│   ├── page.tsx                  # "/" — делегирует redirect.tsx
│   ├── redirect.tsx              # Редирект: авторизован → /dashboard, нет → /login
│   ├── globals.css
│   ├── login/
│   │   └── page.tsx              # Страница входа
│   ├── (dashboard)/              # Route group — общий layout с AuthGuard
│   │   ├── layout.tsx            # AuthGuard + DashboardShell
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── dashboard-view.tsx
│   │   ├── invoices/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── profile/page.tsx
│   │   └── support/page.tsx
│   └── api/                      # Серверные API-роуты
│       ├── auth/contract/route.ts
│       ├── auth/logout/route.ts
│       ├── news/route.ts
│       ├── news/[id]/route.ts
│       ├── support/faq/route.ts
│       └── support/tickets/route.ts
├── components/                   # React-компоненты
│   ├── auth-guard.tsx
│   ├── theme-provider.tsx
│   ├── ui/                       # Переиспользуемые UI-примитивы
│   │   ├── ui-button.tsx
│   │   ├── ui-card.tsx
│   │   └── ui-input.tsx
│   ├── dashboard/
│   │   ├── dashboard-shell.tsx   # Layout панели (шапка, навигация, футер)
│   │   └── dashboard-balance-card.tsx
│   └── profile/
│       ├── profile-personal-info.tsx
│       ├── profile-contact-info.tsx
│       ├── profile-address-info.tsx
│       └── profile-contract-info.tsx
├── lib/                          # Утилиты, серверная логика, мок-данные
│   ├── auth.ts                   # Сессии (cookie + Supabase)
│   ├── formatters.ts             # formatDateShort, formatKopeks
│   ├── supabase-server.ts        # Supabase-клиент (server-side)
│   ├── mock-invoices.ts          # Генерация моковых счетов
│   └── mock-invoice-details.ts   # Статический мок деталей счёта
├── store/                        # Zustand-хранилища (клиент)
│   ├── use-user-store.ts         # Авторизация + данные пользователя
│   └── use-account-store.ts      # Данные лицевого счёта
└── types/                        # TypeScript-интерфейсы
    ├── index.ts                  # Barrel-экспорт
    ├── user.ts
    ├── account.ts
    ├── invoice.ts
    └── news.ts
```

---

## Почему такая структура папок

Проект следует стандартной конвенции **Next.js App Router** с разделением по ответственности:

| Папка | Зона ответственности |
|---|---|
| `app/` | Маршрутизация, страницы, API-эндпоинты — всё, что определяет URL |
| `components/` | React-компоненты, которые не являются страницами |
| `lib/` | Чистые функции, серверная логика, клиенты БД, мок-данные |
| `store/` | Клиентское состояние (Zustand + persist в localStorage) |
| `types/` | TypeScript-интерфейсы и типы |

Это **feature-light** вариант: папки делятся по *техническому слою* (компоненты / утилиты / стор / типы), а не по *фичам* (auth / invoices / profile). Такой подход типичен для небольших проектов — пока файлов мало, навигация по слоям проще, чем по фичам.

---

## Проблема: компоненты не отделены от функций и данных

В нескольких местах нарушен принцип единственной ответственности (SRP):

### 1. `types/invoice.ts` — типы + утилиты в одном файле

Файл содержит не только интерфейсы (`Invoice`, `InvoiceStatus`), но и:
- `formatInvoicePeriod()` — функция форматирования
- `invoiceStatusLabels` — маппинг статусов на строки
- `invoiceStatusColors` — маппинг статусов на CSS-классы

**Почему плохо:** папка `types/` по смыслу — только определения типов. Утилитные функции и маппинги — это логика отображения, им место в `lib/` (например `lib/invoice-formatters.ts`).

### 2. `components/dashboard/dashboard-shell.tsx` — всё в одном

Один файл содержит:
- Layout-компонент (шапка + сайдбар + футер)
- Навигацию с активными ссылками
- Переключатель темы (светлая/тёмная)
- Логику logout (вызов API + очистка сторов)
- **6+ инлайновых SVG-иконок** (HomeIcon, DocumentIcon, UserIcon, ChatIcon, LogoutIcon, SunIcon, MoonIcon)

**Почему плохо:** при изменении одной иконки или навигации надо трогать весь файл. Иконки стоит вынести в `components/icons/`, логику logout — в хук `useLogout()`, навигационные ссылки — в конфиг.

### 3. `store/use-user-store.ts` — стор + хелпер

Кроме Zustand-стора, экспортирует функцию `getShortName(user)` для форматирования ФИО. Это утилита отображения, ей место в `lib/`.

### 4. `lib/` — свалка разнородных файлов

В одной папке лежат:
- **Серверная логика** (`auth.ts`, `supabase-server.ts`) — работает только на сервере, использует `cookies()` из Next.js
- **Чистые утилиты** (`formatters.ts`) — работают и на клиенте, и на сервере
- **Мок-данные** (`mock-invoices.ts`, `mock-invoice-details.ts`) — временные заглушки для разработки

**Почему плохо:** серверный код, клиентские утилиты и тестовые данные — три разные вещи. Если случайно импортировать `auth.ts` в клиентский компонент, сборка сломается (потому что `cookies()` не работает на клиенте).

---

## Как можно улучшить

```
src/
├── app/                    # Без изменений — маршруты и API
├── components/
│   ├── icons/              # SVG-иконки отдельно
│   ├── ui/                 # Без изменений — примитивы
│   ├── dashboard/          # Только компоненты отображения
│   └── profile/
├── lib/
│   ├── server/             # auth.ts, supabase-server.ts — только сервер
│   ├── formatters.ts       # Чистые утилиты
│   └── invoice-helpers.ts  # formatInvoicePeriod, statusLabels, statusColors
├── mocks/                  # Мок-данные отдельно (удалятся при подключении реального API)
│   ├── invoices.ts
│   └── invoice-details.ts
├── store/                  # Только Zustand-сторы, без хелперов
└── types/                  # Только интерфейсы и типы, без логики
```

**Ключевые изменения:**
- Иконки → `components/icons/`
- Серверный код → `lib/server/`
- Мок-данные → `mocks/` (легко найти и удалить позже)
- Утилиты из `types/` и `store/` → `lib/`

---

## Итог

Текущая структура — рабочая, но "плоская". Пока проект маленький (41 файл), это не критично. Проблемы начнутся при росте: когда в `lib/` будет 20 файлов, а в `dashboard-shell.tsx` — 500 строк, навигация станет тяжёлой. Разделение по ответственности сейчас сэкономит время потом.
