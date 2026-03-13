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
  console.log(`[LegacyDB] Querying password for contract: ${contractNumber}`)
  try {
    const result = await getPool().query<{ password: string }>(
      'SELECT password FROM contracts WHERE number = $1',
      [contractNumber]
    )
    const password = result.rows[0]?.password ?? null
    console.log(`[LegacyDB] Result for ${contractNumber}: ${password ? 'Found' : 'Not Found'}`)
    return password
  } catch (err) {
    console.error(`[LegacyDB] Error querying contract ${contractNumber}:`, err)
    throw err
  }
}
