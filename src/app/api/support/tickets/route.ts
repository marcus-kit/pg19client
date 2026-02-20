/**
 * API-роут тикетов поддержки.
 *
 * GET /api/support/tickets — возвращает список тикетов (пока пустой).
 * POST /api/support/tickets — создаёт новый тикет в Supabase.
 *
 * Требует авторизацию (requireUser).
 * Принимает: subject, description, category.
 * Подтягивает данные пользователя (имя, email, телефон, telegram) из БД.
 */
import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  await requireUser()
  return Response.json({ tickets: [] })
}

export async function POST(request: NextRequest) {
  const session = await requireUser()
  const body = await request.json().catch(() => ({}))
  const { subject, description, category = 'other' } = body || {}
  if (!subject?.trim() || !description?.trim()) {
    return Response.json({ message: 'Укажите тему и описание' }, { status: 400 })
  }
  try {
    const supabase = getSupabaseServer()
    const { data: user } = await supabase
      .from('users')
      .select('first_name, last_name, email, phone, telegram_id')
      .eq('id', session.id)
      .single()

    const userName = user
      ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || null
      : null

    const { data, error } = await supabase
      .from('tickets')
      .insert({
        user_id: session.id,
        user_name: userName,
        user_email: (user as { email?: string })?.email ?? null,
        user_phone: (user as { phone?: string })?.phone ?? null,
        user_telegram_id: (user as { telegram_id?: string | number })?.telegram_id
          ? Number((user as { telegram_id?: string }).telegram_id)
          : null,
        subject: String(subject).trim(),
        description: String(description).trim(),
        category: String(category).trim() || 'other',
        status: 'new',
        priority: 'normal',
      })
      .select('id, number')
      .single()

    if (error) {
      console.error('support ticket create:', error)
      return Response.json({ message: 'Не удалось создать заявку' }, { status: 500 })
    }
    return Response.json(
      { ticket: { id: data?.id, number: (data as { number?: string })?.number }, success: true },
      { status: 201 }
    )
  } catch {
    return Response.json({ message: 'Не удалось создать заявку' }, { status: 500 })
  }
}
