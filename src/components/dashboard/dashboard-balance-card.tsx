/**
 * Карточки статуса и подключения на главной странице дашборда.
 *
 * Первая карточка — статус договора (Активен/Заблокирован) с пульсирующим
 * индикатором и датой следующей оплаты.
 * Вторая карточка — подключение: название тарифа и список адресов
 * с активным статусом. Адреса больше 3 скрываются за кнопкой «Показать ещё».
 * Кнопка «Оплатить сейчас» открывает модалку (если все счета оплачены).
 */
'use client'

import { useState } from 'react'
import { UiCard } from '@/components/ui/ui-card'
import { UiButton } from '@/components/ui/ui-button'
import { useAccountStore, isBlocked } from '@/store/use-account-store'
import { connectionAddresses } from '@/utils/mockAddress.const'
import { CalendarIcon, CheckIcon, ChevronDownIcon, MapPinIcon, WifiIcon, XCircleIcon } from '../icons/icons'

export function DashboardBalanceCard() {
  const account = useAccountStore((s) => s.account)
  const blocked = isBlocked(account)
  const [showAllAddresses, setShowAllAddresses] = useState(false)
  const [showAllPaidModal, setShowAllPaidModal] = useState(false)

  const nextPaymentDate = (() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
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

  const handlePayClick = () => {
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
