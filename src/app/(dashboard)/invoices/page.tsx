'use client'

import { useState, useMemo } from 'react'
import { UiCard } from '@/components/ui/ui-card'
import { UiButton } from '@/components/ui/ui-button'
import {
  type Invoice,
  type InvoiceStatus,
  formatInvoicePeriod,
  invoiceStatusLabels,
  invoiceStatusColors,
} from '@/types/invoice'
import { formatKopeks, formatDateShort } from '@/lib/formatters'
import { mockInvoiceDetails } from '@/lib/mock-invoice-details'

const UNPAID_STATUSES: InvoiceStatus[] = ['pending', 'sent', 'viewed', 'expired']

function getMonthDates(year: number, month: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return {
    start: start.toISOString().split('T')[0] ?? null,
    end: end.toISOString().split('T')[0] ?? null,
  }
}

function generateMockInvoices(): Invoice[] {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const list: Invoice[] = []

  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear
  const nextDates = getMonthDates(nextYear, nextMonth)

  list.push({
    id: `mock-invoice-${nextYear}-${String(nextMonth).padStart(2, '0')}`,
    invoiceNumber: `INV-${nextYear}${String(nextMonth).padStart(2, '0')}-001`,
    accountId: 'mock-account-id',
    contractId: null,
    status: 'pending',
    amount: mockInvoiceDetails.totalToPay,
    description: 'Ежемесячная плата за интернет',
    periodStart: nextDates.start,
    periodEnd: nextDates.end,
    issuedAt: new Date(nextYear, nextMonth - 1, 1).toISOString(),
    dueDate: new Date(nextYear, nextMonth, 0).toISOString(),
    paidAt: null,
    createdAt: new Date(nextYear, nextMonth - 1, 1).toISOString(),
    updatedAt: new Date(nextYear, nextMonth - 1, 1).toISOString(),
  })

  for (let i = 0; i < 9; i++) {
    let month = currentMonth - i - 1
    let year = currentYear
    while (month <= 0) {
      month += 12
      year -= 1
    }
    const monthDates = getMonthDates(year, month)
    const paidDate = new Date(year, month - 1, 10 + (i % 20))
    list.push({
      id: `mock-invoice-${year}-${String(month).padStart(2, '0')}`,
      invoiceNumber: `INV-${year}${String(month).padStart(2, '0')}-001`,
      accountId: 'mock-account-id',
      contractId: null,
      status: 'paid',
      amount: mockInvoiceDetails.totalToPay,
      description: 'Ежемесячная плата за интернет',
      periodStart: monthDates.start,
      periodEnd: monthDates.end,
      issuedAt: new Date(year, month - 1, 1).toISOString(),
      dueDate: new Date(year, month, 0).toISOString(),
      paidAt: paidDate.toISOString(),
      createdAt: new Date(year, month - 1, 1).toISOString(),
      updatedAt: paidDate.toISOString(),
    })
  }
  return list
}

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
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
  const [servicesModalInvoice, setServicesModalInvoice] = useState<Invoice | null>(null)

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
          <UiCard
            key={invoice.id}
            hover
            className="cursor-pointer"
            onClick={() => setServicesModalInvoice(invoice)}
          >
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
        ))}

        {filteredInvoices.length === 0 && (
          <UiCard padding="lg">
            <p className="text-center text-[var(--text-muted)]">Счетов не найдено</p>
          </UiCard>
        )}
      </div>

      {servicesModalInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setServicesModalInvoice(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between border-b p-6"
              style={{ borderColor: 'var(--glass-border)' }}
            >
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Состав услуг</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {servicesModalInvoice.invoiceNumber} • {formatInvoicePeriod(servicesModalInvoice)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setServicesModalInvoice(null)}
                className="rounded-lg p-2 transition-colors hover:bg-[var(--glass-bg)]"
              >
                <CloseIcon className="h-5 w-5 text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-6">
              <div className="space-y-6">
                {mockInvoiceDetails.addresses.map((addr, idx) => (
                  <div key={idx} className="space-y-4">
                    <div
                      className="rounded-xl border-l-4 border-primary bg-gradient-to-r from-primary/10 to-secondary/5 p-4"
                    >
                      <p className="text-sm font-semibold leading-relaxed text-[var(--text-primary)]">
                        {addr.address}
                      </p>
                    </div>
                    <div className="space-y-2 pl-4">
                      {addr.services.map((svc, sidx) => (
                        <div
                          key={sidx}
                          className="flex items-start justify-between gap-4 rounded-lg p-4"
                          style={{
                            background: 'var(--glass-bg)',
                            borderBottom:
                              sidx < addr.services.length - 1 ? '1px solid var(--glass-border)' : undefined,
                          }}
                        >
                          <p className="text-sm text-[var(--text-primary)]">{svc.name}</p>
                          <span className="text-base font-bold whitespace-nowrap text-[var(--text-primary)]">
                            {formatKopeks(svc.price)} ₽
                          </span>
                        </div>
                      ))}
                      <div
                        className="mt-3 flex items-center justify-between gap-4 rounded-lg border-2 p-4"
                        style={{ borderColor: 'var(--glass-border)' }}
                      >
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          Итого по адресу:
                        </span>
                        <span className="text-lg font-bold text-primary whitespace-nowrap">
                          {formatKopeks(addr.services.reduce((s, x) => s + x.price, 0))} ₽
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div
                  className="border-t-2 pt-6"
                  style={{ borderColor: 'var(--glass-border)' }}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between rounded-lg p-3" style={{ background: 'var(--glass-bg)' }}>
                      <span className="text-sm text-[var(--text-muted)]">Сумма услуг:</span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {formatKopeks(mockInvoiceDetails.totalAmount)} ₽
                      </span>
                    </div>
                    <div className="flex justify-between rounded-lg p-3" style={{ background: 'var(--glass-bg)' }}>
                      <span className="text-sm text-[var(--text-muted)]">Баланс счета:</span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {formatKopeks(mockInvoiceDetails.balance)} ₽
                      </span>
                    </div>
                    <div
                      className="mt-2 flex justify-between rounded-lg border-2 p-4"
                      style={{ borderColor: 'var(--glass-border)' }}
                    >
                      <span className="font-bold text-[var(--text-primary)]">Итого к оплате:</span>
                      <span className="text-xl font-bold text-primary">
                        {formatKopeks(mockInvoiceDetails.totalToPay)} ₽
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {UNPAID_STATUSES.includes(servicesModalInvoice.status) && (
              <div
                className="border-t p-6"
                style={{ borderColor: 'var(--glass-border)', background: 'var(--bg-surface)' }}
              >
                <UiButton
                  variant="primary"
                  className="w-full sm:w-auto"
                  onClick={() => window.open('https://invoice.doka.team/', '_blank')}
                >
                  Счет на оплату
                </UiButton>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
