import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import type { LegacyServiceRow, LegacyPayRow } from './legacyDb'

const syncCache = new Map<string, number>()
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 часов

/**
 * Синхронизирует billing-данные (charges + pays) из legacy БД для одного контракта.
 * Вызывается лениво при запросе счетов, не чаще раза в 6 часов на контракт.
 */
export async function syncContractBillingIfNeeded(contractId: string, contractNumber: string): Promise<void> {
  const lastSync = syncCache.get(contractId) ?? 0
  if (Date.now() - lastSync < SYNC_INTERVAL_MS) return

  console.log(`[LegacySync] Starting sync for ${contractNumber} (${contractId})`)

  try {
    const [legacyServices, legacyPays] = await Promise.all([
      queryLegacyServices(contractNumber),
      queryLegacyPays(contractNumber)
    ])

    const prisma = usePrisma()

    // --- Sync charges ---
    if (legacyServices.length > 0) {
      const existingCharges = await prisma.invoiceLog.findMany({
        where: { contract_id: contractId, operation_type: 'charge' },
        select: { created_at: true }
      })

      const existingMonths = new Set(
        existingCharges
          .filter(c => c.created_at)
          .map(c => {
            const d = new Date(c.created_at!)
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          })
      )

      // Группируем legacy services по месяцу
      const monthGroups = new Map<string, LegacyServiceRow[]>()
      for (const row of legacyServices) {
        const d = new Date(row.service_time)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!monthGroups.has(key)) monthGroups.set(key, [])
        monthGroups.get(key)!.push(row)
      }

      const newCharges = Array.from(monthGroups.entries())
        .filter(([month]) => !existingMonths.has(month))
        .map(([, rows]) => {
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
            created_by: 'legacy-sync'
          }
        })

      if (newCharges.length > 0) {
        await prisma.invoiceLog.createMany({ data: newCharges })
        console.log(`[LegacySync] Created ${newCharges.length} new charges for ${contractNumber}`)
      }
    }

    // --- Sync pays ---
    if (legacyPays.length > 0) {
      const existingPays = await prisma.pays.findMany({
        where: { contract_id: contractId },
        select: { pay_date: true, amount: true }
      })

      const existingPayKeys = new Set(
        existingPays.map(p => {
          const d = new Date(p.pay_date)
          return `${d.toISOString().slice(0, 10)}|${Number(p.amount).toFixed(2)}`
        })
      )

      const newPays = legacyPays
        .filter(row => {
          const d = new Date(row.pay_date)
          const amountRub = (Number(row.sum) / 100).toFixed(2)
          return !existingPayKeys.has(`${d.toISOString().slice(0, 10)}|${amountRub}`)
        })
        .map(row => ({
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

      if (newPays.length > 0) {
        await prisma.pays.createMany({ data: newPays })
        console.log(`[LegacySync] Created ${newPays.length} new pays for ${contractNumber}`)
      }
    }

    syncCache.set(contractId, Date.now())
    console.log(`[LegacySync] Sync complete for ${contractNumber}`)
  } catch (err) {
    console.error(`[LegacySync] Error syncing ${contractNumber}:`, err)
  }
}

/**
 * Синхронизирует billing для всех контрактов. Для одноразового бэкфилла.
 */
export async function syncAllContracts(): Promise<{ synced: number; errors: number }> {
  const prisma = usePrisma()
  const contracts = await prisma.contract.findMany({
    select: { id: true, contract_number: true }
  })

  let synced = 0
  let errors = 0

  for (const c of contracts) {
    if (!c.contract_number) continue
    try {
      // Сбросить кеш чтобы принудительно синхронизировать
      syncCache.delete(c.id)
      await syncContractBillingIfNeeded(c.id, c.contract_number)
      synced++
    } catch {
      errors++
    }
  }

  console.log(`[LegacySync] Backfill complete: ${synced} synced, ${errors} errors`)
  return { synced, errors }
}
