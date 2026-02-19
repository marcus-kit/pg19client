'use client'

import { UiCard } from '@/components/ui/ui-card'
import { useAccountStore } from '@/store/use-account-store'

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

export function ProfileAddressInfo() {
  const account = useAccountStore((s) => s.account)

  return (
    <UiCard>
      <h2 className="mb-3 text-base font-semibold text-[var(--text-primary)] md:mb-5 md:text-lg">
        Адрес подключения
      </h2>
      <div className="flex items-start gap-2 md:gap-4">
        <div className="flex flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10 p-2 md:rounded-xl md:p-3">
          <MapPinIcon className="h-4 w-4 text-primary md:h-6 md:w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words text-xs text-[var(--text-primary)] md:text-base">
            {account?.address || '—'}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)] md:mt-1 md:text-sm">
            Адрес предоставления услуг
          </p>
        </div>
      </div>
    </UiCard>
  )
}
