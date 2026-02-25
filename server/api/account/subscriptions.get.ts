import type { Subscription, SubscriptionStatus, Service } from '~/types/service'

export default defineEventHandler(async (event) => {
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) throw createError({ statusCode: 401, message: 'Требуется авторизация' })
  if (!sessionUser.accountId) return { subscriptions: [] as Subscription[] }

  const prisma = usePrisma()
  const account = await prisma.account.findFirst({
    where: { id: sessionUser.accountId, user_id: sessionUser.id },
    select: { contract_id: true }
  })
  if (!account?.contract_id) return { subscriptions: [] as Subscription[] }

  const contractServices = await prisma.contractService.findMany({
    where: { contract_id: account.contract_id, is_active: true },
    orderBy: { activated_at: 'desc' },
    select: { id: true, name: true, type: true, is_active: true, activated_at: true, created_at: true, updated_at: true }
  })
  if (!contractServices.length) return { subscriptions: [] as Subscription[] }

  const catalogRows = await prisma.serviceCatalog.findMany({
    select: { id: true, name: true, service_category: true, default_mrc: true, default_nrc: true }
  })
  const catalogByName = new Map<string, (typeof catalogRows)[0]>()
  for (const row of catalogRows) {
    if (row.name) catalogByName.set(row.name.toLowerCase(), row)
    if (row.service_category) catalogByName.set(row.service_category.toLowerCase(), row)
  }

  const subscriptions: Subscription[] = contractServices.map(cs => {
    const catalog = catalogByName.get(cs.name?.toLowerCase() ?? '') ?? catalogByName.get(cs.type?.toLowerCase() ?? '') ?? null
    const svc: Service | undefined = catalog
      ? {
          id: catalog.id as unknown as number,
          name: catalog.name ?? '',
          slug: catalog.service_category ?? null,
          description: null,
          priceMonthly: Number(catalog.default_mrc ?? 0),
          priceConnection: catalog.default_nrc != null ? Number(catalog.default_nrc) : null,
          icon: null,
          color: null,
          features: null,
          equipment: null,
          sortOrder: 0,
          isActive: true
        }
      : undefined
    return {
      id: cs.id,
      accountId: sessionUser.accountId,
      serviceId: catalog?.id ?? cs.id,
      status: (cs.is_active ? 'active' : 'paused') as SubscriptionStatus,
      startedAt: (cs.activated_at ?? cs.created_at)?.toISOString() ?? new Date().toISOString(),
      expiresAt: null as string | null,
      customPrice: null as number | null,
      isPrimary: cs.type === 'internet',
      createdAt: cs.created_at?.toISOString() ?? new Date().toISOString(),
      updatedAt: cs.updated_at?.toISOString() ?? new Date().toISOString(),
      service: svc
    }
  })
  return { subscriptions }
})
