import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import type { LegacyContractInfo } from './legacyApi'
import type { LegacyServiceRow } from './legacyDb'

const LEGACY_EXECUTIVE_ID = 'legacy-import'

function determineServiceType(priceName: string): string {
  const lower = priceName.toLowerCase()
  if (lower.includes('интернет') || lower.includes('internet')) return 'internet'
  if (lower.includes('видеонаблюд') || lower.includes('камер')) return 'cctv'
  if (lower.includes('тв') || lower.includes('телевид')) return 'tv'
  if (lower.includes('домофон')) return 'intercom'
  if (lower.includes('телефон')) return 'phone'
  if (lower.includes('аренд')) return 'rent'
  return 'other'
}

/**
 * Проверяет пароль в старой БД, получает данные из API,
 * создаёт User, Contract, ContractServices и Account в локальной БД.
 * Возвращает null если пароль неверный или договор не найден.
 *
 * Перед обращением к legacy DB проверяет наличие договора в public.customers.
 * Если договор не найден в customers — сразу возвращает null (legacy не вызывается).
 * ФИО, телефон и email берутся из customers.
 */
export async function importContractFromLegacy(contractNumber: string, password: string) {
  console.log(`[LegacyImport] Starting import for ${contractNumber}`)

  // 0. Проверяем наличие договора в public.customers
  const prisma = usePrisma()
  const customer = await prisma.customer.findFirst({
    where: { number: contractNumber }
  })

  if (!customer) {
    console.log(`[LegacyImport] Contract ${contractNumber} not found in public.customers — skipping legacy DB`)
    return null
  }

  console.log(`[LegacyImport] Contract ${contractNumber} found in customers (id=${customer.id}), checking legacy password...`)

  // 1. Проверяем пароль в старой БД
  const legacyPassword = await queryLegacyContractPassword(contractNumber)

  if (legacyPassword === null) {
    console.log(`[LegacyImport] Contract ${contractNumber} not found in Legacy DB`)
    return null
  }

  if (legacyPassword !== password) {
    console.log(`[LegacyImport] Password mismatch for ${contractNumber}`)
    return null
  }

  console.log(`[LegacyImport] Password correct, fetching full info for ${contractNumber}...`)

  // 2. Получаем данные из API + billing-историю параллельно
  const [apiData, legacyServices, legacyPays] = await Promise.all([
    fetchLegacyContractInfo(contractNumber),
    queryLegacyServices(contractNumber),
    queryLegacyPays(contractNumber)
  ])

  // 3. Создаём сущности в локальной БД
  const now = new Date()
  const userId = randomUUID()
  const contractId = randomUUID()
  const balance = new Prisma.Decimal(apiData?.balance ?? '0')
  const firstAddress = apiData?.addresses?.[0]?.address ?? null

  try {
    return await prisma.$transaction(async (tx) => {
      // User — ФИО, телефон, email берём из public.customers
      const fullNameParts = [customer.last_name, customer.first_name, customer.middle_name].filter(Boolean)
      await tx.user.create({
        data: {
          id: userId,
          first_name: customer.first_name || null,
          last_name: customer.last_name || null,
          middle_name: customer.middle_name || null,
          full_name: fullNameParts.length ? fullNameParts.join(' ') : null,
          email: customer.email || null,
          phone: customer.phone_number || null,
          telegram_id: null,
          telegram_username: null,
          birth_date: null,
          avatar: null,
          vk_id: '',
          status: 'active',
          created_at: now,
          updated_at: now
        }
      })

      // Placeholder executive (upsert)
      await tx.executives.upsert({
        where: { id: LEGACY_EXECUTIVE_ID },
        update: {},
        create: { id: LEGACY_EXECUTIVE_ID, name: 'Legacy Import' }
      })

      // Contract
      await tx.contract.create({
        data: {
          id: contractId,
          contract_number: contractNumber,
          owner_user_id: userId,
          balance,
          status: 'active',
          pay_day: 20,
          executive_id: LEGACY_EXECUTIVE_ID,
          address_full: firstAddress,
          start_date: customer.added_date ? new Date(customer.added_date) : null,
          id_1c: null,
          is_blocked: false,
          contract_password: password,
          created_at: now,
          updated_at: now
        }
      })

      // ContractServices
      const contractServices: Array<{ name: string; type: string }> = []
      if (apiData?.addresses) {
        for (const addr of apiData.addresses) {
          for (const svc of addr.services) {
            const serviceId = randomUUID()
            const type = determineServiceType(svc.price_name)
            const isActive = svc.status === 'открыт' && svc.periodic_status === 'действует'

            await tx.contractService.create({
              data: {
                id: serviceId,
                contract_id: contractId,
                name: svc.price_name,
                type,
                object_address: addr.address,
                is_active: isActive,
                activated_at: null,
                id_1c: null,
                created_at: now,
                updated_at: now
              }
            })

            if (isActive) {
              contractServices.push({ name: svc.price_name, type })
            }
          }
        }
      }

      // Account
      const account = await tx.account.create({
        data: {
          user_id: userId,
          contract_id: contractId,
          contract_number: contractNumber,
          balance,
          status: 'active',
          address_full: firstAddress,
          start_date: customer.added_date ? new Date(customer.added_date) : null
        },
        select: { id: true }
      })

      // Billing: начисления из legacy services → invoice_logs
      if (legacyServices.length > 0) {
        // Группируем по месяцу
        const monthGroups = new Map<string, typeof legacyServices>()
        for (const row of legacyServices) {
          const d = new Date(row.service_time)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (!monthGroups.has(key)) monthGroups.set(key, [])
          monthGroups.get(key)!.push(row)
        }

        const chargeRecords = Array.from(monthGroups.entries()).map(([, rows]) => {
          const totalKopeks = rows.reduce((s, r) => s + Number(r.cost), 0)
          const services = rows
            .filter(r => Number(r.cost) > 0)
            .map(r => ({ name: r.service_name, amount: Number(r.cost) / 100 }))
          return {
            id: randomUUID(),
            contract_id: contractId,
            operation_type: 'charge',
            balance: new Prisma.Decimal(0),
            total_amount: new Prisma.Decimal(totalKopeks / 100),
            services,
            created_at: new Date(rows[0]!.service_time),
            created_by: 'legacy-import'
          }
        })

        await tx.invoiceLog.createMany({ data: chargeRecords })
        console.log(`[LegacyImport] Created ${chargeRecords.length} charge invoice_logs for ${contractNumber}`)
      }

      // Billing: платежи из legacy pays → только billing.pays
      if (legacyPays.length > 0) {
        const payRecords = legacyPays.map(row => ({
          id: randomUUID(),
          contract_id: contractId,
          pay_date: new Date(row.pay_date),
          amount: new Prisma.Decimal(Number(row.sum) / 100),
          note: null as string | null,
          document_number: null as string | null,
          source: row.source || 'неопределен',
          remote: true,
          created_at: new Date(row.pay_date),
          updated_at: new Date(row.pay_date)
        }))

        await tx.pays.createMany({ data: payRecords })
        console.log(`[LegacyImport] Created ${payRecords.length} pays for ${contractNumber}`)
      }

      const startDate = customer.added_date ? new Date(customer.added_date) : null

      return {
        contract: {
          id: contractId,
          owner_user_id: userId,
          contract_number: contractNumber,
          balance,
          status: 'active',
          is_blocked: false,
          pay_day: 20,
          address_full: firstAddress,
          start_date: startDate
        },
        user: {
          id: userId,
          first_name: customer.first_name || null,
          last_name: customer.last_name || null,
          middle_name: customer.middle_name || null,
          email: customer.email || null,
          phone: customer.phone_number || null,
          telegram_id: null,
          telegram_username: null,
          birth_date: null,
          avatar: null,
          vk_id: '',
          status: 'active'
        },
        account: { id: account.id },
        contractServices
      }
    })
  } catch (err: any) {
    // Гонка: другой запрос уже создал этот договор
    if (err?.code === 'P2002') {
      return null
    }
    throw err
  }
}

/** Создаёт Contract + ContractServices + Account + Billing для одного договора внутри транзакции */
async function importSingleContract(
  tx: Parameters<Parameters<ReturnType<typeof usePrisma>['$transaction']>[0]>[0],
  opts: {
    contractNumber: string
    contractPassword: string
    userId: string
    customer: { added_date: Date | null }
    apiData: LegacyContractInfo | null
    legacyServices: LegacyServiceRow[]
    legacyPays: import('./legacyDb').LegacyPayRow[]
  }
): Promise<string> {
  const { contractNumber, contractPassword, userId, customer, apiData, legacyServices, legacyPays } = opts
  const now = new Date()
  const contractId = randomUUID()
  const balance = new Prisma.Decimal(apiData?.balance ?? '0')
  const firstAddress = apiData?.addresses?.[0]?.address ?? null

  await tx.executives.upsert({
    where: { id: LEGACY_EXECUTIVE_ID },
    update: {},
    create: { id: LEGACY_EXECUTIVE_ID, name: 'Legacy Import' }
  })

  await tx.contract.create({
    data: {
      id: contractId,
      contract_number: contractNumber,
      owner_user_id: userId,
      balance,
      status: 'active',
      pay_day: 20,
      executive_id: LEGACY_EXECUTIVE_ID,
      address_full: firstAddress,
      start_date: customer.added_date ? new Date(customer.added_date) : null,
      id_1c: null,
      is_blocked: false,
      contract_password: contractPassword,
      created_at: now,
      updated_at: now
    }
  })

  if (apiData?.addresses) {
    for (const addr of apiData.addresses) {
      for (const svc of addr.services) {
        const type = determineServiceType(svc.price_name)
        const isActive = svc.status === 'открыт' && svc.periodic_status === 'действует'
        await tx.contractService.create({
          data: {
            id: randomUUID(),
            contract_id: contractId,
            name: svc.price_name,
            type,
            object_address: addr.address,
            is_active: isActive,
            activated_at: null,
            id_1c: null,
            created_at: now,
            updated_at: now
          }
        })
      }
    }
  }

  const account = await tx.account.create({
    data: {
      user_id: userId,
      contract_id: contractId,
      contract_number: contractNumber,
      balance,
      status: 'active',
      address_full: firstAddress,
      start_date: customer.added_date ? new Date(customer.added_date) : null
    },
    select: { id: true }
  })

  if (legacyServices.length > 0) {
    const monthGroups = new Map<string, LegacyServiceRow[]>()
    for (const row of legacyServices) {
      const d = new Date(row.service_time)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!monthGroups.has(key)) monthGroups.set(key, [])
      monthGroups.get(key)!.push(row)
    }

    const chargeRecords = Array.from(monthGroups.entries()).map(([, rows]) => {
      const totalKopeks = rows.reduce((s, r) => s + Number(r.cost), 0)
      const services = rows
        .filter(r => Number(r.cost) > 0)
        .map(r => ({ name: r.service_name, amount: Number(r.cost) / 100 }))
      return {
        id: randomUUID(),
        contract_id: contractId,
        operation_type: 'charge',
        balance: new Prisma.Decimal(0),
        total_amount: new Prisma.Decimal(totalKopeks / 100),
        services,
        created_at: new Date(rows[0]!.service_time),
        created_by: 'legacy-import'
      }
    })

    await tx.invoiceLog.createMany({ data: chargeRecords })
  }

  if (legacyPays.length > 0) {
    const payRecords = legacyPays.map(row => ({
      id: randomUUID(),
      contract_id: contractId,
      pay_date: new Date(row.pay_date),
      amount: new Prisma.Decimal(Number(row.sum) / 100),
      note: null as string | null,
      document_number: null as string | null,
      source: row.source || 'неопределен',
      remote: true,
      created_at: new Date(row.pay_date),
      updated_at: new Date(row.pay_date)
    }))

    await tx.pays.createMany({ data: payRecords })
  }

  return account.id
}

/**
 * Ищет договоры по телефону в public.customers, импортирует из legacy.
 * Создаёт User (если не передан existingUserId) + Contract + Account для каждого договора.
 * Возвращает userId и список accountIds, или null если ничего не найдено.
 */
export async function importContractsByPhone(
  normalizedPhone: string,
  existingUserId?: string
): Promise<{ userId: string; accountIds: string[] } | null> {
  console.log(`[LegacyImport] Searching contracts by phone: ${normalizedPhone}`)

  const prisma = usePrisma()

  // Ищем в customers по нормализованному телефону (убираем всё кроме цифр)
  const customers = await prisma.$queryRaw<Array<{
    id: number
    number: string | null
    first_name: string | null
    last_name: string | null
    middle_name: string | null
    phone_number: string | null
    email: string | null
    added_date: Date | null
  }>>`
    SELECT id, number, first_name, last_name, middle_name, phone_number, email, added_date
    FROM public.customers
    WHERE regexp_replace(phone_number, '[^0-9]', '', 'g') = ${normalizedPhone}
      AND number IS NOT NULL AND number != ''
  `

  if (!customers.length) {
    console.log(`[LegacyImport] No customers found for phone ${normalizedPhone}`)
    return null
  }

  console.log(`[LegacyImport] Found ${customers.length} customers for phone ${normalizedPhone}`)

  // Фильтруем: пропускаем договоры, которые уже есть в локальной БД
  const contractNumbers = customers.map(c => c.number!).filter(Boolean)
  const existingContracts = await prisma.contract.findMany({
    where: { contract_number: { in: contractNumbers } },
    select: { contract_number: true }
  })
  const existingSet = new Set(existingContracts.map(c => c.contract_number))

  const newCustomers = customers.filter(c => !existingSet.has(c.number!))

  if (!newCustomers.length && !existingUserId) {
    // Все договоры уже импортированы, но пользователя у нас нет
    // Значит они привязаны к другому user — возвращаем null
    console.log(`[LegacyImport] All contracts already exist for phone ${normalizedPhone}`)
    return null
  }

  // Получаем данные из legacy для новых договоров
  const importData: Array<{
    customer: typeof newCustomers[0]
    contractNumber: string
    password: string
    apiData: LegacyContractInfo | null
    legacyServices: LegacyServiceRow[]
    legacyPays: import('./legacyDb').LegacyPayRow[]
  }> = []

  for (const cust of newCustomers) {
    const contractNumber = cust.number!
    const password = await queryLegacyContractPassword(contractNumber)
    if (!password) {
      console.log(`[LegacyImport] No password in legacy for ${contractNumber}, skipping`)
      continue
    }

    const [apiData, legacyServices, legacyPays] = await Promise.all([
      fetchLegacyContractInfo(contractNumber),
      queryLegacyServices(contractNumber),
      queryLegacyPays(contractNumber)
    ])

    importData.push({ customer: cust, contractNumber, password, apiData, legacyServices, legacyPays })
  }

  if (!importData.length && !existingUserId) {
    console.log(`[LegacyImport] No importable contracts for phone ${normalizedPhone}`)
    return null
  }

  const firstCustomer = newCustomers[0] ?? customers[0]!
  let userId = existingUserId ?? ''
  const accountIds: string[] = []

  try {
    await prisma.$transaction(async (tx) => {
      // Создаём User если нет existingUserId
      if (!existingUserId) {
        userId = randomUUID()
        const fullNameParts = [firstCustomer.last_name, firstCustomer.first_name, firstCustomer.middle_name].filter(Boolean)
        const now = new Date()
        await tx.user.create({
          data: {
            id: userId,
            first_name: firstCustomer.first_name || null,
            last_name: firstCustomer.last_name || null,
            middle_name: firstCustomer.middle_name || null,
            full_name: fullNameParts.length ? fullNameParts.join(' ') : null,
            email: firstCustomer.email || null,
            phone: firstCustomer.phone_number || null,
            telegram_id: null,
            telegram_username: null,
            birth_date: null,
            avatar: null,
            vk_id: '',
            status: 'active',
            created_at: now,
            updated_at: now
          }
        })
        console.log(`[LegacyImport] Created user ${userId} for phone ${normalizedPhone}`)
      }

      // Импортируем каждый новый договор
      for (const data of importData) {
        const accountId = await importSingleContract(tx, {
          contractNumber: data.contractNumber,
          contractPassword: data.password,
          userId,
          customer: { added_date: data.customer.added_date },
          apiData: data.apiData,
          legacyServices: data.legacyServices,
          legacyPays: data.legacyPays
        })
        accountIds.push(accountId)
        console.log(`[LegacyImport] Imported contract ${data.contractNumber} → account ${accountId}`)
      }

      // Для существующего пользователя: привязать уже существующие контракты,
      // если у них owner_user_id совпадает или если у пользователя нет account для них
      if (existingUserId) {
        for (const contractNumber of existingSet) {
          const contract = await tx.contract.findFirst({
            where: { contract_number: contractNumber },
            select: { id: true, contract_number: true, balance: true, address_full: true, start_date: true }
          })
          if (!contract) continue

          const existingAccount = await tx.account.findFirst({
            where: { user_id: existingUserId, contract_id: contract.id }
          })
          if (existingAccount) {
            accountIds.push(existingAccount.id)
            continue
          }

          const newAccount = await tx.account.create({
            data: {
              user_id: existingUserId,
              contract_id: contract.id,
              contract_number: contract.contract_number ?? '',
              balance: contract.balance ?? 0,
              status: 'active',
              address_full: contract.address_full ?? null,
              start_date: contract.start_date ?? null
            },
            select: { id: true }
          })
          accountIds.push(newAccount.id)
          console.log(`[LegacyImport] Linked existing contract ${contractNumber} → account ${newAccount.id} for user ${existingUserId}`)
        }
      }
    })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      console.log(`[LegacyImport] Race condition for phone ${normalizedPhone}`)
      return null
    }
    throw err
  }

  console.log(`[LegacyImport] Phone import complete: user=${userId}, accounts=${accountIds.length}`)
  return { userId, accountIds }
}
