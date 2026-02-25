interface ContractAuthData {
  contractNumber: string
  lastName: string
  firstName: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ContractAuthData>(event)

  if (!body.contractNumber || !body.lastName || !body.firstName) {
    throw createError({ statusCode: 400, message: 'Заполните все поля' })
  }

  const prisma = usePrisma()
  const contractNumber = String(body.contractNumber).trim()

  const contract = await prisma.contract.findFirst({
    where: { contract_number: contractNumber },
    select: { id: true, owner_user_id: true, contract_number: true, balance: true, status: true, is_blocked: true, pay_day: true, address_full: true, start_date: true }
  })

  if (!contract) {
    throw createError({ statusCode: 404, message: 'Договор не найден' })
  }

  const customerLinks = await prisma.customerContract.findMany({
    where: { contract_id: contract.id },
    select: { customer_id: true }
  })
  const candidateUserIds = [
    contract.owner_user_id,
    ...customerLinks.map(c => c.customer_id)
  ].filter(Boolean) as string[]

  if (candidateUserIds.length === 0) {
    throw createError({ statusCode: 404, message: 'Пользователь по договору не найден' })
  }

  const users = await prisma.user.findMany({
    where: { id: { in: candidateUserIds } },
    select: { id: true, first_name: true, last_name: true, middle_name: true, email: true, phone: true, telegram_id: true, telegram_username: true, birth_date: true, avatar: true, vk_id: true, status: true }
  })

  if (!users.length) {
    throw createError({ statusCode: 404, message: 'Пользователь не найден' })
  }

  const lastNameLower = body.lastName.toLowerCase().trim()
  const firstNameLower = body.firstName.toLowerCase().trim()
  const user = users.find(
    u =>
      u.last_name?.toLowerCase() === lastNameLower &&
      u.first_name?.toLowerCase() === firstNameLower
  )

  if (!user) {
    throw createError({ statusCode: 401, message: 'Неверные данные. Проверьте фамилию и имя.' })
  }
  if (user.status === 'suspended' || user.status === 'terminated') {
    throw createError({ statusCode: 403, message: 'Ваш аккаунт заблокирован' })
  }

  let accountId: string
  const existingAccount = await prisma.account.findFirst({
    where: { user_id: user.id, contract_id: contract.id },
    select: { id: true }
  })

  if (existingAccount) {
    accountId = existingAccount.id
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: {
        contract_number: contract.contract_number ?? undefined,
        balance: contract.balance ?? undefined,
        status: contract.status ?? undefined,
        address_full: contract.address_full ?? undefined,
        start_date: contract.start_date ?? undefined,
        updated_at: new Date()
      }
    })
  } else {
    const newAccount = await prisma.account.create({
      data: {
        user_id: user.id,
        contract_id: contract.id,
        contract_number: contract.contract_number ?? '',
        balance: contract.balance ?? 0,
        status: contract.status ?? 'active',
        address_full: contract.address_full ?? null,
        start_date: contract.start_date ?? null
      },
      select: { id: true }
    })
    accountId = newAccount.id
  }

  const contractServices = await prisma.contractService.findMany({
    where: { contract_id: contract.id, is_active: true },
    select: { name: true, type: true }
  })
  const internetService = contractServices.find((s: { type: string | null }) => s.type === 'internet')
  const tariffName = internetService?.name ?? contractServices[0]?.name ?? 'Не подключен'

  await createUserSession(event, user.id, accountId, 'contract', body.contractNumber, {
    last_name: body.lastName,
    first_name: body.firstName
  })

  return {
    success: true,
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
      birthDate: user.birth_date ?? null,
      role: 'user'
    },
    account: {
      contractNumber: contract.contract_number ?? '',
      balance: Number(contract.balance ?? 0),
      status: (contract.is_blocked ? 'blocked' : 'active') as 'active' | 'blocked',
      tariff: tariffName,
      address: contract.address_full ?? '',
      startDate: contract.start_date,
      payDay: contract.pay_day ?? 20
    }
  }
})
