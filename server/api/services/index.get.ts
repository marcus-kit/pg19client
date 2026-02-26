import type { Service } from '~/types/service'

export default defineEventHandler(async (event) => {
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) throw createError({ statusCode: 401, message: 'Требуется авторизация' })

  const prisma = usePrisma()
  const rows = await prisma.serviceCatalog.findMany({
    where: { suspended: false },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, service_category: true, default_mrc: true, default_nrc: true, suspended: true }
  })

  const services: Service[] = rows.map(row => ({
    id: row.id,
    name: row.name ?? '',
    slug: row.service_category ?? null,
    description: null,
    priceMonthly: Number(row.default_mrc ?? 0),
    priceConnection: row.default_nrc != null ? Number(row.default_nrc) : null,
    icon: null,
    color: null,
    features: null,
    equipment: null,
    sortOrder: 0,
    isActive: !row.suspended
  }))
  return { services }
})
