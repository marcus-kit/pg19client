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

export interface LegacyServiceRow {
  name: string
  cost: string
  service_time: Date
  service_name: string
}

/**
 * Получает начисления (ежемесячные услуги) из legacy БД.
 * cost — в копейках. При ошибке возвращает пустой массив.
 */
export async function queryLegacyServices(contractNumber: string): Promise<LegacyServiceRow[]> {
  console.log(`[LegacyDB] Querying services for contract: ${contractNumber}`)
  try {
    const result = await getPool().query<LegacyServiceRow>(
      `SELECT s.name, s.cost, s.service_time, s.service_name
       FROM services s
       WHERE s.contract_id IN (SELECT id FROM contracts WHERE number = $1)
         AND s.service_time > '2025-12-01'
       ORDER BY s.service_time ASC`,
      [contractNumber]
    )
    console.log(`[LegacyDB] Services for ${contractNumber}: ${result.rows.length} rows`)
    return result.rows
  } catch (err) {
    console.error(`[LegacyDB] Error querying services for ${contractNumber}:`, err)
    return []
  }
}

export interface LegacyPayRow {
  sum: string
  pay_date: Date
  source: string
}

/**
 * Получает платежи из legacy БД.
 * sum — в копейках. При ошибке возвращает пустой массив.
 */
export async function queryLegacyPays(contractNumber: string): Promise<LegacyPayRow[]> {
  console.log(`[LegacyDB] Querying pays for contract: ${contractNumber}`)
  try {
    const result = await getPool().query<LegacyPayRow>(
      `SELECT p.sum, p.pay_date, p.source
       FROM pays p
       WHERE p.contract_id = (SELECT id FROM contracts WHERE number = $1)
         AND p.pay_date > '2025-12-01'
       ORDER BY p.pay_date ASC`,
      [contractNumber]
    )
    console.log(`[LegacyDB] Pays for ${contractNumber}: ${result.rows.length} rows`)
    return result.rows
  } catch (err) {
    console.error(`[LegacyDB] Error querying pays for ${contractNumber}:`, err)
    return []
  }
}
