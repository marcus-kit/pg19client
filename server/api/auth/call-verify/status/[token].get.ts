/**
 * GET /api/auth/call-verify/status/[token]
 * Проверка статуса верификации (polling fallback)
 */
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({ statusCode: 400, message: 'Token required' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: request, error } = await supabase
    .from('phone_verification_requests')
    .select('status')
    .eq('token', token)
    .single()

  if (error || !request) {
    throw createError({ statusCode: 404, message: 'Token not found' })
  }

  return { status: request.status }
})
