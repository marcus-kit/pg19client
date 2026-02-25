export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const prisma = usePrisma()

  const where: { status: string; category?: string; OR?: { expires_at: null }[] | { expires_at: { gt: Date } }[] } = {
    status: 'published'
  }
  if (query.category) where.category = String(query.category)
  if (query.active === 'true') {
    where.OR = [{ expires_at: null }, { expires_at: { gt: new Date() } }]
  }

  const data = await prisma.news.findMany({
    where,
    orderBy: [{ is_pinned: 'desc' }, { published_at: 'desc' }]
  })

  const news = data.map((item: { id: string; title: string | null; summary: string | null; content: string | null; category: string | null; status: string | null; published_at: Date | null; expires_at: Date | null; is_pinned: boolean | null; date_created: Date | null; date_updated: Date | null }) => ({
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
    updatedAt: item.date_updated
  }))
  return { news }
})
