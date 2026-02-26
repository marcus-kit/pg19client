/**
 * Prisma client для серверных API.
 * Подключение к PostgreSQL через DATABASE_URL (без Supabase).
 * Импорт по умолчанию для совместимости ESM (Nitro) с CommonJS-модулем @prisma/client.
 */
import pkg from '@prisma/client'
const { PrismaClient } = pkg

let _prisma: InstanceType<typeof PrismaClient> | null = null

export function usePrisma(): InstanceType<typeof PrismaClient> {
  if (_prisma) return _prisma
  _prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  })
  return _prisma
}
