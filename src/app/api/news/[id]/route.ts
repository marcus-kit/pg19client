import { NextRequest } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabaseServer()

  const { data: item, error } = await supabase
    .from('news')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !item) {
    return Response.json({ message: 'Новость не найдена' }, { status: 404 })
  }

  const news = {
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
    attachments: (item.attachments as Array<Record<string, unknown>>) || [],
  }

  return Response.json({ news })
}
