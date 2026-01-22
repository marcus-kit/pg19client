# =====================================================
# PG19 Client Portal - Production Dockerfile
# =====================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml .npmrc ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args for build-time env vars
ARG SUPABASE_URL
ARG SUPABASE_KEY
ARG TELEGRAM_BOT_USERNAME
ARG YANDEX_MAPS_API_KEY
ARG TWA_URL

# Set env vars for build
ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_KEY=${SUPABASE_KEY}
ENV TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME}
ENV YANDEX_MAPS_API_KEY=${YANDEX_MAPS_API_KEY}
ENV TWA_URL=${TWA_URL}

# Build the app
RUN pnpm build

# Stage 3: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nuxtjs

# Copy built output
COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./.output

USER nuxtjs

# Expose port
EXPOSE 3000

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", ".output/server/index.mjs"]
