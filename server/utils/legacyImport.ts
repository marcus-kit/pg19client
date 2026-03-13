import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import type { LegacyContractInfo } from './legacyApi'

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

  // 2. Получаем данные из API
  const apiData = await fetchLegacyContractInfo(contractNumber)

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
