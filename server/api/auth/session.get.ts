/**
 * GET /api/auth/session — текущая сессия (user + account)
 * Используется для гидратации store после входа через OIDC, когда клиент не получает user/account напрямую.
 */
import { getUserFromSession } from '../../../utils/userAuth'

export default defineEventHandler(async (event) => {
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) throw createError({ statusCode: 401, message: 'Требуется авторизация' })

  const prisma = usePrisma()
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      middle_name: true,
      phone: true,
      email: true,
      telegram_username: true,
      telegram_id: true,
      birth_date: true,
      avatar: true,
      vk_id: true
    }
  })

  if (!user) throw createError({ statusCode: 404, message: 'Пользователь не найден' })

  let account: {
    contractNumber: string
    balance: number
    status: 'active' | 'blocked'
    tariff: string
    address: string
    startDate: Date | null
    payDay: number
  } | null = null

  if (sessionUser.accountId) {
    const acc = await prisma.account.findFirst({
      where: { id: sessionUser.accountId, user_id: sessionUser.id },
      select: {
        contract_id: true,
        contract_number: true,
        balance: true,
        status: true,
        address_full: true,
        start_date: true
      }
    })
    if (acc?.contract_id) {
      const contract = await prisma.contract.findUnique({
        where: { id: acc.contract_id },
        select: { pay_day: true, is_blocked: true }
      })
      const services = await prisma.contractService.findMany({
        where: { contract_id: acc.contract_id, is_active: true },
        select: { name: true, type: true }
      })
      const internetService = services.find((s) => s.type === 'internet')
      const tariffName = internetService?.name ?? services[0]?.name ?? 'Не подключен'
      account = {
        contractNumber: acc.contract_number ?? '',
        balance: Number(acc.balance ?? 0),
        status: (contract?.is_blocked ? 'blocked' : 'active') as 'active' | 'blocked',
        tariff: tariffName,
        address: acc.address_full ?? '',
        startDate: acc.start_date,
        payDay: contract?.pay_day ?? 20
      }
    }
  }

  return {
    user: {
      id: user.id,
      firstName: user.first_name ?? '',
      lastName: user.last_name ?? '',
      middleName: user.middle_name ?? '',
      phone: user.phone ?? '',
      email: user.email ?? '',
      telegram: user.telegram_username ? `@${user.telegram_username}` : '',
      telegramId: user.telegram_id ?? null,
      vkId: user.vk_id ?? '',
      avatar: user.avatar ?? null,
      birthDate: user.birth_date ? user.birth_date.toISOString().slice(0, 10) : null,
      role: 'user' as const
    },
    account
  }
})
