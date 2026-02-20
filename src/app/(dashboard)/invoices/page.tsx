/**
 * Страница списка счетов (/invoices).
 *
 * Генерирует моковые счета через generateMockInvoices().
 * Фильтры: Все / К оплате / Оплаченные.
 * Каждый счёт — карточка с иконкой, номером, периодом, статусом и суммой.
 * Клик по счёту переходит на /invoices/[id] (детализация).
 */
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { UiCard } from '@/components/ui/ui-card'
import {
  type Invoice,
  type InvoiceStatus,
  formatInvoicePeriod,
  invoiceStatusLabels,
  invoiceStatusColors,
} from '@/types/invoice'
import { formatKopeks, formatDateShort } from '@/lib/formatters'
import { generateMockInvoices, UNPAID_STATUSES } from '@/lib/mock-invoices'

function getStatusBadgeClass(status: InvoiceStatus): string {
  if (UNPAID_STATUSES.includes(status)) return 'bg-red-500/20 text-red-400'
  const map: Record<string, string> = {
    gray: 'bg-gray-600/20 text-gray-400',
    primary: 'bg-primary/20 text-primary',
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-accent/20 text-accent',
    red: 'bg-red-500/20 text-red-400',
  }
  return map[invoiceStatusColors[status]] ?? map.gray
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

const filters = [
  { value: 'all' as const, label: 'Все' },
  { value: 'unpaid' as const, label: 'К оплате' },
  { value: 'paid' as const, label: 'Оплаченные' },
]

export default function InvoicesPage() {
  const [invoices] = useState<Invoice[]>(() => generateMockInvoices())
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all')

  const filteredInvoices = useMemo(() => {
    if (filter === 'unpaid') return invoices.filter((inv) => UNPAID_STATUSES.includes(inv.status))
    if (filter === 'paid') return invoices.filter((inv) => inv.status === 'paid')
    return invoices
  }, [invoices, filter])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Счета</h1>
        <p className="mt-1 text-[var(--text-muted)]">История выставленных счетов</p>
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === f.value ? 'bg-primary text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            style={filter !== f.value ? { background: 'var(--glass-bg)' } : undefined}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredInvoices.map((invoice) => (
          <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
            <UiCard hover className="cursor-pointer">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10">
                    {invoice.status === 'paid' ? (
                      <CheckIcon className="h-6 w-6 text-accent" />
                    ) : (
                      <DocumentIcon className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs text-[var(--text-muted)]">{invoice.invoiceNumber}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}
                      >
                        {invoiceStatusLabels[invoice.status]}
                      </span>
                    </div>
                    <p className="font-medium text-[var(--text-primary)]">{formatInvoicePeriod(invoice)}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      {invoice.issuedAt && <span>Выставлен: {formatDateShort(invoice.issuedAt)}</span>}
                      {invoice.paidAt && <span>Оплачен: {formatDateShort(invoice.paidAt)}</span>}
                      {!invoice.paidAt && invoice.dueDate && (
                        <span>Срок: {formatDateShort(invoice.dueDate)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-[var(--text-primary)]">
                    {formatKopeks(invoice.amount)}
                    <span className="text-sm font-normal text-[var(--text-muted)]"> ₽</span>
                  </span>
                  <ChevronRightIcon className="h-5 w-5 text-[var(--text-muted)]" />
                </div>
              </div>
            </UiCard>
          </Link>
        ))}

        {filteredInvoices.length === 0 && (
          <UiCard padding="lg">
            <p className="text-center text-[var(--text-muted)]">Счетов не найдено</p>
          </UiCard>
        )}
      </div>
    </div>
  )
}
