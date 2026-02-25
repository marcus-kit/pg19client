export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID новости обязателен' })

  const prisma = usePrisma()
  const newsItem = await prisma.news.findFirst({
    where: { id, status: 'published' }
  })
  if (!newsItem) throw createError({ statusCode: 404, message: 'Новость не найдена' })

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
      attachments: []
    }
  }
})
