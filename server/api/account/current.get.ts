/**
 * GET /api/account/current
 * Текущий аккаунт с данными договора (payDay, статус блокировки).
 * Если в сессии нет account_id, но у пользователя ровно один активный договор —
 * находим или создаём аккаунт и обновляем сессию.
 */
export default defineEventHandler(async (event) => {
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) throw createError({ statusCode: 401, message: 'Требуется авторизация' })

  const prisma = usePrisma()
  let account: {
    id: string
    contract_id: string
    contract_number: string
    balance: unknown
    status: string
    address_full: string | null
    start_date: Date | null
  } | null = null

  if (sessionUser.accountId) {
    account = await prisma.account.findFirst({
      where: { id: sessionUser.accountId, user_id: sessionUser.id },
      select: {
        id: true,
        contract_id: true,
        contract_number: true,
        balance: true,
        status: true,
        address_full: true,
        start_date: true
      }
    })
  } else {
    // Восстановление: один активный договор — находим/создаём аккаунт и обновляем сессию
    {
      const asOwner = await prisma.contract.findMany({
        where: { owner_user_id: sessionUser.id, status: 'active' },
        select: { id: true }
      })
      const asCustomer = await prisma.customerContract.findMany({
        where: { customer_id: sessionUser.id },
        select: { contract_id: true }
      })
      const contractIds = [
        ...asOwner.map((c) => c.id),
        ...asCustomer.map((c) => c.contract_id).filter(Boolean)
      ]
      const activeContracts = await prisma.contract.findMany({
        where: { id: { in: contractIds }, status: 'active' },
        select: {
          id: true,
          contract_number: true,
          balance: true,
          status: true,
          address_full: true,
          start_date: true
        }
      })
      if (activeContracts.length === 1) {
        const contract = activeContracts[0]!
        let existing = await prisma.account.findFirst({
          where: { user_id: sessionUser.id, contract_id: contract.id },
          select: {
            id: true,
            contract_id: true,
            contract_number: true,
            balance: true,
            status: true,
            address_full: true,
            start_date: true
          }
        })
        if (existing) {
          await prisma.account.update({
            where: { id: existing.id },
            data: {
              contract_number: contract.contract_number ?? undefined,
              balance: contract.balance ?? undefined,
              status: contract.status ?? undefined,
              address_full: contract.address_full ?? undefined,
              start_date: contract.start_date ?? undefined,
              updated_at: new Date()
            }
          })
          account = { ...existing, contract_id: existing.contract_id! }
        } else {
          const created = await prisma.account.create({
            data: {
              user_id: sessionUser.id,
              contract_id: contract.id,
              contract_number: contract.contract_number ?? '',
              balance: contract.balance ?? 0,
              status: contract.status ?? 'active',
              address_full: contract.address_full ?? null,
              start_date: contract.start_date ?? null
            },
            select: {
              id: true,
              contract_id: true,
              contract_number: true,
              balance: true,
              status: true,
              address_full: true,
              start_date: true
            }
          })
          account = created
        }
        const jti = await getSessionJti(event)
        if (jti) {
          await refreshSessionAccount(event, sessionUser.id, account.id, jti)
          await prisma.authSession.updateMany({
            where: { id: jti },
            data: { account_id: account.id }
          })
        }
      }
    }
  }

  if (!account?.contract_id) return { account: null }

  const contract = await prisma.contract.findUnique({
    where: { id: account.contract_id },
    select: { pay_day: true, is_blocked: true, status: true }
  })
  if (!contract || contract.status !== 'active') {
    return { account: null }
  }

  const contractServices = await prisma.contractService.findMany({
    where: { contract_id: account.contract_id, is_active: true },
    select: { name: true, type: true }
  })
  const internetService = contractServices.find((s) => s.type === 'internet')
  const tariffName = internetService?.name ?? contractServices[0]?.name ?? 'Не подключен'

  return {
    account: {
      contractNumber: account.contract_number,
      balance: Number(account.balance),
      status: (contract?.is_blocked ? 'blocked' : 'active') as 'active' | 'blocked',
      tariff: tariffName,
      address: account.address_full ?? '',
      startDate: account.start_date,
      payDay: contract?.pay_day ?? 20
    }
  }
})
