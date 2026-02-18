/**
 * Временный dev-эндпоинт: проверка таблиц в Supabase по схемам.
 * GET /api/_dev/db-inspect
 * GET /api/_dev/db-inspect?schemas=public,billing,my_schema  — проверить свои схемы
 *
 * В Supabase кастомные схемы нужно "открыть" для API:
 * Project Settings → API → Exposed schemas (добавить billing и др.).
 */

/** Таблицы, которые приложение ожидает в public */
const PUBLIC_TABLES = [
  'auth_sessions',
  'users',
  'accounts',
  'services',
  'subscriptions',
  'news',
  'news_attachments',
  'pages',
  'telegram_auth_requests',
  'phone_verification_requests',
  'tickets',
  'ticket_comments',
  'community_rooms',
  'community_members',
  'community_messages',
  'community_mutes',
  'community_reports',
  'chats',
  'chat_messages',
  'ai_bot_settings',
  'ai_bot_messages'
] as const

/** Схема → таблицы (какие таблицы в какой схеме ожидает приложение) */
const SCHEMA_TABLES: Record<string, string[]> = {
  public: [...PUBLIC_TABLES],
  billing: ['invoices'],
  client: [...PUBLIC_TABLES, 'invoices'] // в вашем Supabase данные в схеме client
}

function parseSchemas(query: Record<string, string>): string[] {
  const param = query.schemas
  if (param && typeof param === 'string') {
    return param.split(',').map(s => s.trim()).filter(Boolean)
  }
  return ['public', 'billing', 'client']
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as Record<string, string>
  const schemasToCheck = parseSchemas(query)
  const listAll = query.list === '1' || query.list === 'true'

  const supabase = useSupabaseServer()

  // Опционально: полный список схем и таблиц из БД (нужна функция get_schemas_and_tables)
  let allTablesInDb: { table_schema: string; table_name: string }[] | null = null
  if (listAll) {
    const { data, error } = await supabase.rpc('get_schemas_and_tables')
    if (!error && Array.isArray(data)) {
      allTablesInDb = data as { table_schema: string; table_name: string }[]
    }
  }

  const results: { schema: string; table: string; exists: boolean; error?: string }[] = []

  for (const schema of schemasToCheck) {
    const tables = SCHEMA_TABLES[schema] ?? []
    if (tables.length === 0) {
      // Неизвестная схема — пробуем хотя бы одну таблицу, чтобы понять, открыта ли схема
      const { error } = await supabase.schema(schema).from('_').select('*').limit(0)
      const schemaValid = error?.message?.includes('relation') || error?.message?.includes('Could not find')
      const invalidSchema = error?.message?.toLowerCase().includes('invalid schema')
      results.push({
        schema,
        table: '(проверка схемы)',
        exists: false,
        error: invalidSchema
          ? 'Схема не открыта для API. Project Settings → API → Exposed schemas'
          : schemaValid
            ? 'Схема доступна, таблицы не заданы для проверки'
            : error?.message
      })
      continue
    }

    for (const table of tables) {
      try {
        const builder =
          schema === 'public'
            ? supabase.from(table)
            : supabase.schema(schema).from(table)
        const { error } = await builder.select('*').limit(0)
        const exists = !error
        results.push({
          schema,
          table,
          exists,
          ...(error && !exists ? { error: error.message } : {})
        })
      } catch (e: any) {
        results.push({
          schema,
          table,
          exists: false,
          error: e?.message || String(e)
        })
      }
    }
  }

  const exists = results.filter(r => r.exists)
  const missing = results.filter(r => !r.exists)

  // Группировка по схемам
  const bySchema: Record<string, typeof results> = {}
  for (const r of results) {
    if (!bySchema[r.schema]) bySchema[r.schema] = []
    bySchema[r.schema].push(r)
  }

  const response: Record<string, unknown> = {
    hint: 'Кастомные схемы (не public) должны быть в Exposed schemas в настройках проекта Supabase. Добавить свои: ?schemas=public,billing,имя_схемы',
    schemasChecked: schemasToCheck,
    summary: {
      total: results.length,
      exists: exists.length,
      missing: missing.length
    },
    bySchema,
    tables: results,
    missingTables: missing.map(m => `${m.schema}.${m.table}`)
  }

  if (listAll) {
    if (allTablesInDb) {
      response.allTablesInDb = allTablesInDb
      response.schemasInDb = [...new Set(allTablesInDb.map(t => t.table_schema))]
    } else {
      response.allTablesInDbHint = 'Создайте функцию get_schemas_and_tables (см. supabase/migrations/20260218_inspect_schemas_rpc.sql), затем снова ?list=1'
    }
  }

  return response
})
