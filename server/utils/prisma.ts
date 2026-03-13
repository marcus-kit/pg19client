/**
 * Prisma client для серверных API (Prisma 7.x + PostgreSQL adapter).
 */
import pkg from '@prisma/client'
const { PrismaClient } = pkg
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true })

let _prisma: InstanceType<typeof PrismaClient> | null = null

export function usePrisma(): InstanceType<typeof PrismaClient> {
  if (_prisma) return _prisma

  const url = process.env.DATABASE_URL
  if (!url) {
    console.log('[Prisma] DATABASE_URL is NOT SET. Available env keys:', Object.keys(process.env).filter(k => !k.includes('PASS') && !k.includes('SECRET')))
  } else {
    console.log(`[Prisma] Initializing with URL host: ${url.split('@')[1] || 'unknown'}`)
  }

  const pool = new pg.Pool({ connectionString: url })
  const adapter = new PrismaPg(pool)

  _prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  })

  return _prisma
}
