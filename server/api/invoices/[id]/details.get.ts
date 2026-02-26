/** Формат деталей счёта для фронта (совпадает с InvoiceDetails из useInvoiceServices) */
interface InvoiceDetailsResponse {
  addresses: { address: string; services: { name: string; price: number }[] }[]
  totalAmount: number
  balance: number
  totalToPay: number
}

/** Элемент услуги в JSON из БД (в рублях: amount или price) */
interface DbServiceItem {
  name?: string
  amount?: number
  price?: number
  [key: string]: unknown
}

/** Группа по адресу в JSON из БД */
interface DbAddressGroup {
  address?: string
  services?: DbServiceItem[]
  [key: string]: unknown
}

/** Нормализация JSON services из invoice_logs в формат фронта (цены в копейках) */
function normalizeServices(raw: unknown): InvoiceDetailsResponse['addresses'] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return []
  }

  /** Рубли из БД (поле amount или price) → копейки для фронта */
  const rubToKopeks = (s: DbServiceItem): number => {
    const rub = Number((s as { amount?: number }).amount ?? s.price ?? 0)
    return Math.round(rub * 100)
  }

  const first = raw[0] as Record<string, unknown>
  // Формат: массив групп { address, services: [ { name, amount/price } ] }
  if (first && typeof first === 'object' && 'address' in first && Array.isArray((first as DbAddressGroup).services)) {
    return (raw as DbAddressGroup[]).map((g) => ({
      address: typeof g.address === 'string' ? g.address : '—',
      services: ((g.services ?? []) as DbServiceItem[]).map((s) => ({
        name: typeof s.name === 'string' ? s.name : '—',
        price: rubToKopeks(s)
      }))
    }))
  }

  // Формат: плоский массив { name, amount } или { name, price } — одна группа "Услуги"
  const items = (raw as DbServiceItem[]).map((s) => ({
    name: typeof s.name === 'string' ? s.name : '—',
    price: rubToKopeks(s)
  }))
  if (items.length === 0) return []
  return [{ address: 'Услуги', services: items }]
}

export default defineEventHandler(async (event): Promise<InvoiceDetailsResponse> => {
  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) throw createError({ statusCode: 401, message: 'Требуется авторизация' })
  if (!sessionUser.accountId) throw createError({ statusCode: 403, message: 'Нет привязки к счёту' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Не указан id счёта' })

  const prisma = usePrisma()
  const account = await prisma.account.findFirst({
    where: { id: sessionUser.accountId, user_id: sessionUser.id },
    select: { contract_id: true }
  })
  if (!account?.contract_id) throw createError({ statusCode: 403, message: 'Договор не найден' })

  const row = await prisma.invoiceLog.findFirst({
    where: { id, contract_id: account.contract_id },
    select: { id: true, balance: true, total_amount: true, services: true }
  })

  if (!row) throw createError({ statusCode: 404, message: 'Счёт не найден' })

  const totalAmountRub = Number(row.total_amount ?? 0)
  const balanceRub = Number(row.balance ?? 0)
  const totalAmount = Math.round(totalAmountRub * 100)
  const balance = Math.round(balanceRub * 100)
  const totalToPay = Math.max(0, totalAmount - balance)

  const addresses = normalizeServices(row.services ?? [])

  return {
    addresses,
    totalAmount,
    balance,
    totalToPay
  }
})
