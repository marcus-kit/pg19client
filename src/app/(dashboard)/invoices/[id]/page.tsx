/**
 * Страница детализации счёта (/invoices/:id).
 *
 * Находит счёт по ID из моковых данных. Показывает: номер, период, статус,
 * список услуг по адресам с ценами, итоги по адресу и общий итог.
 *
 * Для неоплаченных: кнопка "Оплатить" (открывает модалку с QR-кодом)
 * и кнопка "Показать" (открывает ссылку на счёт).
 * Ссылка "Назад к счетам" ведёт на /invoices.
 */
'use client'

import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import { UiButton } from '@/components/ui/ui-button'
import {
  formatInvoicePeriod,
  invoiceStatusLabels,
} from '@/types/invoice'
import { formatKopeks } from '@/lib/formatters'
import { mockInvoiceDetails } from '@/lib/mock-invoice-details'
import { generateMockInvoices, UNPAID_STATUSES } from '@/lib/mock-invoices'

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

export default function InvoiceDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const invoice = useMemo(() => {
    const all = generateMockInvoices()
    return all.find((inv) => inv.id === id) ?? null
  }, [id])

  if (!invoice) {
    return (
      <div className="space-y-6">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Назад к счетам
        </Link>
        <div className="rounded-lg bg-white/5 p-8 text-center">
          <p className="text-[var(--text-muted)]">Счёт не найден</p>
        </div>
      </div>
    )
  }

  const isUnpaid = UNPAID_STATUSES.includes(invoice.status)
  const [showQr, setShowQr] = useState(false)

  return (
    <div className="space-y-6">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Назад к счетам
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Состав услуг</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {invoice.invoiceNumber} &bull; {formatInvoicePeriod(invoice)}
          <span
            className={`ml-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${
              isUnpaid ? 'bg-red-500/20 text-red-400' : 'bg-accent/20 text-accent'
            }`}
          >
            {invoiceStatusLabels[invoice.status]}
          </span>
        </p>
      </div>

      <div className="space-y-6">
        {mockInvoiceDetails.addresses.map((addr, idx) => (
          <div key={idx} className="space-y-4">
            <div className="rounded-xl border-l-4 border-primary bg-gradient-to-r from-primary/10 to-secondary/5 p-4">
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
              className="mt-2 flex items-center justify-between rounded-lg border-2 p-4"
              style={{ borderColor: 'var(--glass-border)' }}
            >
              <span className="font-bold text-[var(--text-primary)]">Итого к оплате:</span>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-primary">
                  {formatKopeks(mockInvoiceDetails.totalToPay)} ₽
                </span>
                {isUnpaid && (
                  <UiButton
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open('https://invoice.doka.team/', '_blank')}
                  >
                    Показать
                  </UiButton>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isUnpaid && (
        <UiButton
          variant="primary"
          className="w-full sm:w-auto"
          onClick={() => setShowQr(true)}
        >
          Оплатить
        </UiButton>
      )}

      {showQr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowQr(false)}
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
            <button
              type="button"
              onClick={() => setShowQr(false)}
              className="absolute right-4 top-4 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--glass-bg)]"
            >
              <span className="text-xl leading-none">&times;</span>
            </button>
            <h3 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">
              Оплата по QR
            </h3>
            <p className="mb-4 text-sm text-[var(--text-muted)]">
              Отсканируйте QR-код в приложении банка
            </p>
            <div className="mx-auto mb-4 flex h-52 w-52 items-center justify-center rounded-xl bg-white p-3">
              <svg viewBox="0 0 29 29" className="h-full w-full" shapeRendering="crispEdges">
                <rect width="29" height="29" fill="#ffffff" />
                <path
                  fill="#000000"
                  d="M0,0h7v1h-7zM8,0h1v1h-1zM10,0h2v1h-2zM14,0h1v1h-1zM16,0h2v1h-2zM19,0h3v1h-3zM22,0h7v1h-7z
M0,1h1v1h-1zM6,1h1v1h-1zM8,1h2v1h-2zM11,1h1v1h-1zM14,1h1v1h-1zM17,1h1v1h-1zM20,1h1v1h-1zM22,1h1v1h-1zM28,1h1v1h-1z
M0,2h1v1h-1zM2,2h3v1h-3zM6,2h1v1h-1zM9,2h1v1h-1zM11,2h3v1h-3zM15,2h2v1h-2zM19,2h1v1h-1zM22,2h1v1h-1zM24,2h3v1h-3zM28,2h1v1h-1z
M0,3h1v1h-1zM2,3h3v1h-3zM6,3h1v1h-1zM8,3h1v1h-1zM10,3h1v1h-1zM13,3h3v1h-3zM18,3h2v1h-2zM22,3h1v1h-1zM24,3h3v1h-3zM28,3h1v1h-1z
M0,4h1v1h-1zM2,4h3v1h-3zM6,4h1v1h-1zM9,4h3v1h-3zM14,4h1v1h-1zM16,4h1v1h-1zM19,4h2v1h-2zM22,4h1v1h-1zM24,4h3v1h-3zM28,4h1v1h-1z
M0,5h1v1h-1zM6,5h1v1h-1zM9,5h1v1h-1zM11,5h1v1h-1zM14,5h1v1h-1zM17,5h1v1h-1zM19,5h1v1h-1zM22,5h1v1h-1zM28,5h1v1h-1z
M0,6h7v1h-7zM8,6h1v1h-1zM10,6h1v1h-1zM12,6h1v1h-1zM14,6h1v1h-1zM16,6h1v1h-1zM18,6h1v1h-1zM20,6h1v1h-1zM22,6h7v1h-7z
M9,7h2v1h-2zM13,7h1v1h-1zM15,7h1v1h-1zM18,7h3v1h-3z
M0,8h4v1h-4zM5,8h2v1h-2zM8,8h3v1h-3zM12,8h2v1h-2zM15,8h1v1h-1zM17,8h1v1h-1zM20,8h2v1h-2zM24,8h2v1h-2zM27,8h2v1h-2z
M0,9h1v1h-1zM3,9h1v1h-1zM5,9h1v1h-1zM8,9h1v1h-1zM10,9h2v1h-2zM13,9h2v1h-2zM16,9h2v1h-2zM19,9h1v1h-1zM21,9h1v1h-1zM24,9h1v1h-1zM26,9h2v1h-2z
M1,10h2v1h-2zM5,10h1v1h-1zM7,10h2v1h-2zM10,10h3v1h-3zM15,10h2v1h-2zM18,10h2v1h-2zM21,10h4v1h-4zM26,10h1v1h-1zM28,10h1v1h-1z
M0,11h2v1h-2zM3,11h1v1h-1zM6,11h2v1h-2zM10,11h1v1h-1zM12,11h2v1h-2zM16,11h1v1h-1zM20,11h2v1h-2zM23,11h1v1h-1zM25,11h1v1h-1zM28,11h1v1h-1z
M0,12h1v1h-1zM2,12h2v1h-2zM6,12h1v1h-1zM8,12h2v1h-2zM11,12h1v1h-1zM14,12h4v1h-4zM20,12h1v1h-1zM23,12h2v1h-2zM27,12h2v1h-2z
M1,13h1v1h-1zM3,13h2v1h-2zM7,13h1v1h-1zM9,13h1v1h-1zM11,13h3v1h-3zM16,13h2v1h-2zM19,13h3v1h-3zM24,13h1v1h-1zM26,13h3v1h-3z
M0,14h2v1h-2zM4,14h2v1h-2zM8,14h1v1h-1zM10,14h1v1h-1zM13,14h1v1h-1zM15,14h2v1h-2zM18,14h1v1h-1zM20,14h1v1h-1zM22,14h1v1h-1zM24,14h2v1h-2zM28,14h1v1h-1z
M2,15h3v1h-3zM6,15h1v1h-1zM9,15h1v1h-1zM12,15h1v1h-1zM14,15h2v1h-2zM17,15h2v1h-2zM21,15h3v1h-3zM25,15h1v1h-1zM27,15h1v1h-1z
M0,16h1v1h-1zM4,16h1v1h-1zM6,16h2v1h-2zM9,16h2v1h-2zM12,16h3v1h-3zM16,16h2v1h-2zM19,16h2v1h-2zM22,16h1v1h-1zM24,16h1v1h-1zM27,16h2v1h-2z
M0,17h1v1h-1zM2,17h1v1h-1zM4,17h1v1h-1zM7,17h2v1h-2zM11,17h1v1h-1zM13,17h2v1h-2zM16,17h1v1h-1zM18,17h3v1h-3zM25,17h1v1h-1zM28,17h1v1h-1z
M1,18h3v1h-3zM5,18h4v1h-4zM10,18h2v1h-2zM14,18h1v1h-1zM16,18h1v1h-1zM18,18h1v1h-1zM20,18h1v1h-1zM23,18h1v1h-1zM25,18h1v1h-1zM27,18h2v1h-2z
M0,19h1v1h-1zM3,19h1v1h-1zM6,19h2v1h-2zM9,19h1v1h-1zM12,19h2v1h-2zM15,19h1v1h-1zM17,19h2v1h-2zM21,19h2v1h-2zM24,19h1v1h-1zM26,19h1v1h-1z
M0,20h2v1h-2zM3,20h2v1h-2zM7,20h1v1h-1zM10,20h3v1h-3zM14,20h2v1h-2zM18,20h1v1h-1zM20,20h2v1h-2zM23,20h2v1h-2zM26,20h3v1h-3z
M8,21h2v1h-2zM12,21h1v1h-1zM14,21h1v1h-1zM16,21h2v1h-2zM19,21h2v1h-2zM22,21h2v1h-2zM25,21h2v1h-2zM28,21h1v1h-1z
M0,22h7v1h-7zM8,22h1v1h-1zM11,22h2v1h-2zM14,22h3v1h-3zM18,22h1v1h-1zM20,22h1v1h-1zM22,22h1v1h-1zM24,22h3v1h-3zM28,22h1v1h-1z
M0,23h1v1h-1zM6,23h1v1h-1zM10,23h2v1h-2zM14,23h1v1h-1zM16,23h1v1h-1zM18,23h2v1h-2zM21,23h2v1h-2zM24,23h1v1h-1zM26,23h3v1h-3z
M0,24h1v1h-1zM2,24h3v1h-3zM6,24h1v1h-1zM8,24h2v1h-2zM12,24h2v1h-2zM15,24h2v1h-2zM19,24h1v1h-1zM22,24h3v1h-3zM26,24h2v1h-2z
M0,25h1v1h-1zM2,25h3v1h-3zM6,25h1v1h-1zM8,25h1v1h-1zM10,25h1v1h-1zM12,25h1v1h-1zM15,25h1v1h-1zM19,25h2v1h-2zM22,25h1v1h-1zM25,25h2v1h-2zM28,25h1v1h-1z
M0,26h1v1h-1zM2,26h3v1h-3zM6,26h1v1h-1zM9,26h2v1h-2zM13,26h3v1h-3zM17,26h2v1h-2zM20,26h1v1h-1zM23,26h1v1h-1zM25,26h1v1h-1zM27,26h2v1h-2z
M0,27h1v1h-1zM6,27h1v1h-1zM8,27h1v1h-1zM11,27h3v1h-3zM15,27h3v1h-3zM20,27h1v1h-1zM22,27h1v1h-1zM24,27h2v1h-2zM27,27h1v1h-1z
M0,28h7v1h-7zM10,28h1v1h-1zM12,28h1v1h-1zM15,28h2v1h-2zM18,28h2v1h-2zM22,28h1v1h-1zM24,28h1v1h-1zM26,28h1v1h-1zM28,28h1v1h-1z"
                />
              </svg>
            </div>
            <p className="mb-1 text-lg font-bold text-[var(--text-primary)]">
              {formatKopeks(mockInvoiceDetails.totalToPay)} ₽
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {invoice.invoiceNumber} &bull; {formatInvoicePeriod(invoice)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
