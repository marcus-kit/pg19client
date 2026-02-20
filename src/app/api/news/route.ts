/**
 * API-роут списка новостей (GET /api/news).
 *
 * Загружает опубликованные новости из Supabase, сортирует по закреплённости
 * и дате. Фильтры через query-параметры: category — по категории,
 * active=true — только не просроченные.
 * Преобразует snake_case из БД в camelCase для фронтенда.
 */
import { NextRequest } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const active = searchParams.get('active')

  const supabase = getSupabaseServer()

  let query = supabase
    .from('news')
    .select('*')
    .eq('status', 'published')
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }
  if (active === 'true') {
    query = query.or(
      `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`
    )
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch news:', error)
    return Response.json(
      { message: 'Ошибка при загрузке новостей' },
      { status: 500 }
    )
  }

  const news = (data || []).map((item: Record<string, unknown>) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    content: item.content,
    category: item.category,
    status: item.status,
    publishedAt: item.published_at,
    expiresAt: item.expires_at,
    isPinned: item.is_pinned,
    createdAt: item.date_created,
    updatedAt: item.date_updated,
  }))

  return Response.json({ news })
}
