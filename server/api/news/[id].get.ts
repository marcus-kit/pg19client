export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID новости обязателен'
    })
  }

  const supabase = useSupabaseServer()

  // Получаем новость (вложения — опционально, если есть таблица news_attachments)
  const { data: newsItem, error: newsError } = await supabase
    .from('news')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (newsError || !newsItem) {
    throw createError({
      statusCode: 404,
      message: 'Новость не найдена'
    })
  }

  let attachments: Array<{ id: number; fileName: string; filePath: string; fileSize: number; mimeType: string; sortOrder: number }> = []
  try {
    const { data: attData } = await supabase
      .from('news_attachments')
      .select('id, file_name, file_path, file_size, mime_type, sort_order')
      .eq('news_id', id)
      .order('sort_order')
    if (Array.isArray(attData)) {
      attachments = attData.map((att: any) => ({
        id: att.id,
        fileName: att.file_name,
        filePath: att.file_path,
        fileSize: att.file_size,
        mimeType: att.mime_type,
        sortOrder: att.sort_order ?? 0
      }))
    }
  } catch {
    // Таблица news_attachments может отсутствовать в client
  }

  return {
    news: {
      id: newsItem.id,
      title: newsItem.title,
      summary: newsItem.summary,
      content: newsItem.content,
      category: newsItem.category,
      publishedAt: newsItem.published_at,
      isPinned: newsItem.is_pinned,
      createdAt: newsItem.date_created,
      attachments
    }
  }
})
