import pg from 'pg'

let pool: pg.Pool | null = null

function getPool(): pg.Pool {
  if (!pool) {
    const config = useRuntimeConfig()
    const connectionString = config.legacyDbUrl as string
    if (!connectionString) {
      throw new Error('LEGACY_DB_URL не настроен')
    }
    pool = new pg.Pool({ connectionString, max: 5 })
  }
  return pool
}

/**
 * Получает пароль договора из старой БД (mlink) по номеру договора.
 * Возвращает пароль или null, если договор не найден.
 */
export async function queryLegacyContractPassword(contractNumber: string): Promise<string | null> {
  const result = await getPool().query<{ password: string }>(
    'SELECT password FROM contracts WHERE number = $1',
    [contractNumber]
  )
  return result.rows[0]?.password ?? null
}
