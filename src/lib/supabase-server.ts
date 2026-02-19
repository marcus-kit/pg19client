import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

/**
 * Supabase client для серверных операций (service role).
 * Таблицы в схеме client.
 */
export function getSupabaseServer(): SupabaseClient {
  if (_client) return _client

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required')
  }

  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'client' },
  }) as unknown as SupabaseClient

  return _client
}
