# ПЖ19 — Личный кабинет (Next.js)

Версия личного кабинета на **Next.js 16** (App Router), перенесённая с Nuxt 4.

## Стек

- **Next.js 16** (App Router), React 19
- **TypeScript**
- **Tailwind CSS 4**
- **Zustand** (состояние + persist в localStorage)
- **next-themes** (светлая/тёмная тема)
- **Supabase** (серверный клиент, схема `client`)

## Запуск

```bash
pnpm install
cp .env.example .env   # заполнить переменные
pnpm dev
```

Откройте [http://localhost:3000](http://localhost:3000). Неавторизованных перенаправит на `/login`, после входа — на `/dashboard`.

## Переменные окружения

См. `.env.example`. Обязательны:

- `SUPABASE_URL` — URL проекта Supabase
- `SUPABASE_KEY` — anon-ключ (если нужен на клиенте)
- `SUPABASE_SECRET_KEY` или `SUPABASE_SERVICE_ROLE_KEY` — для серверных API

## Структура

- `src/app/` — страницы и API (App Router)
- `src/app/(dashboard)/` — защищённые маршруты (дашборд, счета, профиль, поддержка)
- `src/app/api/` — Route Handlers: `auth/contract`, `auth/logout`, `news`, `news/[id]`
- `src/components/` — UI и блоки дашборда
- `src/lib/` — Supabase (сервер), сессии (cookie)
- `src/store/` — Zustand (user, account с persist)
- `src/types/` — общие типы

## Отличия от Nuxt-версии (old)

- Вход по договору и логаут реализованы; Telegram и звонок — заглушки.
- Реализованы: главная (редирект), логин, дашборд (баланс, новости), заглушки для «Счета», «Профиль», «Поддержка».
- Остальные API (invoices, support, community, speedtest и т.д.) и страницы можно переносить по мере необходимости.
