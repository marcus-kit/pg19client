/**
 * GET /api/account/current
 * Текущий аккаунт с данными договора (payDay, статус блокировки).
 * Для обновления account store на дашборде и корректного отображения «Статус договора» / «Следующая оплата».
 */
export default defineEventHandler(async (event) => {
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) throw createError({ statusCode: 401, message: 'Требуется авторизация' })
  if (!sessionUser.accountId) return { account: null }

  const prisma = usePrisma()
  const account = await prisma.account.findFirst({
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
  if (!account?.contract_id) return { account: null }

  const contract = await prisma.contract.findUnique({
    where: { id: account.contract_id },
    select: { pay_day: true, is_blocked: true, status: true }
  })
  // Нет договора или договор не активен — не показываем данные договора
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
