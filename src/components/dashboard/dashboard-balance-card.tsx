'use client'

import { useState } from 'react'
import { UiCard } from '@/components/ui/ui-card'
import { UiButton } from '@/components/ui/ui-button'
import { useAccountStore, isBlocked } from '@/store/use-account-store'

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
function WifiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  )
}
function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

const connectionAddresses = [
  'обл Ростовская, г Таганрог, ул Ломоносова, д. 47',
  'обл Ростовская, г Таганрог, пер Каркасный, д. 9, кв. 16',
  'обл Ростовская, г Таганрог, ул 1-я Котельная, д. 45',
  'обл Ростовская, г Таганрог, пер 14-й Новый, д. 74',
]

export function DashboardBalanceCard() {
  const account = useAccountStore((s) => s.account)
  const blocked = isBlocked(account)
  const [showAllAddresses, setShowAllAddresses] = useState(false)
  const [showAllPaidModal, setShowAllPaidModal] = useState(false)

  const nextPaymentDate = (() => {
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return lastDay.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  })()

  const statusConfig = blocked
    ? {
        text: 'Заблокирован',
        color: 'bg-red-500',
        icon: XCircleIcon,
        iconColor: 'text-red-400',
      }
    : {
        text: 'Активен',
        color: 'bg-accent',
        icon: CheckIcon,
        iconColor: 'text-accent',
      }

  const connectionStatus = account?.tariff || 'Не подключен'
  const StatusIcon = statusConfig.icon
  const visibleAddresses =
    showAllAddresses || connectionAddresses.length <= 3
      ? connectionAddresses
      : connectionAddresses.slice(0, 3)
  const showExpandButton = connectionAddresses.length > 3

  function handlePayClick() {
    setShowAllPaidModal(true)
  }

  return (
    <div className="space-y-4">
      <UiCard hover>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="mb-1 text-sm text-[var(--text-muted)]">Статус договора</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${statusConfig.color}`}
                />
                <span className={`relative inline-flex h-3 w-3 rounded-full ${statusConfig.color}`} />
              </span>
              <span className="text-xl font-semibold text-[var(--text-primary)]">
                {statusConfig.text}
              </span>
            </div>
          </div>
          <div className="icon-container">
            <StatusIcon className={`h-6 w-6 ${statusConfig.iconColor}`} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <CalendarIcon className="h-4 w-4" />
            <span className="text-sm">
              Следующая оплата{' '}
              <span className="block font-medium text-[var(--text-primary)] md:ml-1 md:inline">
                {nextPaymentDate}
              </span>
            </span>
          </div>
          <UiButton size="sm" variant="secondary" onClick={handlePayClick}>
            Оплатить сейчас
          </UiButton>
        </div>
      </UiCard>

      <UiCard hover>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="mb-1 text-sm text-[var(--text-muted)]">Подключение</p>
            <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              {connectionStatus}
            </p>
          </div>
          <div className="icon-container">
            <WifiIcon className="h-6 w-6 text-[var(--color-primary)]" />
          </div>
        </div>
        <div className="space-y-4">
          {visibleAddresses.map((address, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-start gap-3">
                <MapPinIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
                <span className="flex-1 text-sm text-[var(--text-primary)]">{address}</span>
              </div>
              <div className="flex items-center gap-3 pl-7">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
                </span>
                <span className="text-sm text-[var(--text-secondary)]">Услуга активна</span>
              </div>
              {index < visibleAddresses.length - 1 && (
                <div
                  className="border-t pt-2"
                  style={{ borderColor: 'var(--glass-border)' }}
                />
              )}
            </div>
          ))}
          {showExpandButton && (
            <button
              type="button"
              onClick={() => setShowAllAddresses((v) => !v)}
              className="flex w-full items-center justify-center gap-2 py-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <span>
                {showAllAddresses
                  ? 'Свернуть'
                  : `Показать ещё ${connectionAddresses.length - 3}`}
              </span>
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform duration-200 ${showAllAddresses ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
      </UiCard>

      {showAllPaidModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAllPaidModal(false)}
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 text-center"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--glass-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
              <CheckIcon className="h-10 w-10 text-accent" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">
              Все счета оплачены!
            </h3>
            <p className="mb-6 text-[var(--text-muted)]">У вас нет неоплаченных счетов</p>
            <UiButton onClick={() => setShowAllPaidModal(false)} className="w-full">
              Отлично
            </UiButton>
          </div>
        </div>
      )}
    </div>
  )
}
