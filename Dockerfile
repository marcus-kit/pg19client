# =============================================================================
# Dockerfile — Личный кабинет ПЖ19
# =============================================================================
# Сборка:  docker build -t pg19v3client .
# Запуск:  docker run -p 3000:3000 pg19v3client
# =============================================================================

# -----------------------------------------------------------------------------
# Этап 1: Установка зависимостей
# -----------------------------------------------------------------------------
FROM node:24-alpine AS deps

# Включаем pnpm через corepack (встроен в Node.js)
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Копируем только файлы для установки зависимостей (кэширование слоёв)
COPY package.json pnpm-lock.yaml .npmrc ./

# Устанавливаем зависимости (frozen-lockfile = точные версии из lock-файла)
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Этап 2: Сборка приложения
# -----------------------------------------------------------------------------
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Копируем node_modules из предыдущего этапа
COPY --from=deps /app/node_modules ./node_modules

# Копируем исходный код
COPY . .

# Build arguments — публичные переменные, нужные при сборке Nuxt
ARG SUPABASE_URL
ARG SUPABASE_KEY
ARG TELEGRAM_BOT_USERNAME

# Преобразуем ARG в ENV для процесса сборки
ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_KEY=${SUPABASE_KEY}
ENV TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME}

# Собираем production-версию
RUN pnpm build

# -----------------------------------------------------------------------------
# Этап 3: Production-образ
# -----------------------------------------------------------------------------
FROM node:24-alpine AS runner

WORKDIR /app

# Создаём непривилегированного пользователя (безопасность)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nuxtjs

# Копируем только собранное приложение (минимальный размер образа)
COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./.output

# Переключаемся на непривилегированного пользователя
USER nuxtjs

# Порт приложения
EXPOSE 3000

# Runtime переменные
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

# Запуск Nitro-сервера
CMD ["node", ".output/server/index.mjs"]
