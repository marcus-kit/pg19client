'use client'

import { UiCard } from '@/components/ui/ui-card'
import { useAccountStore, isBlocked } from '@/store/use-account-store'
import { formatDate } from '@/lib/formatters'

export function ProfileContractInfo() {
  const account = useAccountStore((s) => s.account)
  const blocked = isBlocked(account)

  return (
    <UiCard>
      <h2 className="mb-3 text-base font-semibold text-[var(--text-primary)] md:mb-5 md:text-lg">
        Договор
      </h2>
      <div className="space-y-2 md:space-y-4">
        <div
          className="flex items-center justify-between py-2 md:py-3"
          style={{ borderBottom: '1px solid var(--glass-border)' }}
        >
          <span className="text-xs text-[var(--text-muted)] md:text-sm">Номер договора</span>
          <span className="text-xs font-medium text-[var(--text-primary)] md:text-base">
            {account?.contractNumber ?? '—'}
          </span>
        </div>
        <div
          className="flex items-center justify-between py-2 md:py-3"
          style={{ borderBottom: '1px solid var(--glass-border)' }}
        >
          <span className="text-xs text-[var(--text-muted)] md:text-sm">Статус</span>
          <span
            className={`rounded px-2 py-0.5 text-[10px] md:text-xs ${
              blocked ? 'bg-red-500/20 text-red-400' : 'bg-accent/20 text-accent'
            }`}
          >
            {blocked ? 'Приостановлен' : 'Активен'}
          </span>
        </div>
        <div
          className="flex items-center justify-between py-2 md:py-3"
          style={{ borderBottom: '1px solid var(--glass-border)' }}
        >
          <span className="text-xs text-[var(--text-muted)] md:text-sm">Тариф</span>
          <span className="text-xs text-[var(--text-primary)] md:text-base">
            {account?.tariff || 'Не подключен'}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 md:py-3">
          <span className="text-xs text-[var(--text-muted)] md:text-sm">Дата заключения</span>
          <span className="text-xs text-[var(--text-primary)] md:text-base">
            {account?.startDate ? formatDate(account.startDate) : '—'}
          </span>
        </div>
      </div>
    </UiCard>
  )
}
