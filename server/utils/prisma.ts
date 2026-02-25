/**
 * Prisma client для серверных API.
 * Подключение к PostgreSQL через DATABASE_URL (без Supabase).
 */
import { PrismaClient } from '@prisma/client'

let _prisma: PrismaClient | null = null

export function usePrisma(): PrismaClient {
  if (_prisma) return _prisma
  _prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  })
  return _prisma
}
