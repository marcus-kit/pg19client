/**
 * Основной контент главной страницы дашборда (/dashboard).
 *
 * Содержит три секции:
 * 1) DashboardBalanceCard — статус и подключение.
 * 2) Счета — превью 3 последних счетов (следующий месяц неоплачен,
 *    текущий и прошлый — оплачены) с ссылкой "Все счета" на /invoices.
 * 3) Новости сообщества — загружает через /api/news, при отсутствии
 *    данных показывает заглушку. Клик по новости открывает модалку NewsModal.
 */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UiCard } from '@/components/ui/ui-card'
import { DashboardBalanceCard } from '@/components/dashboard/dashboard-balance-card'
import type { News, NewsCategory } from '@/types'
import type { Invoice } from '@/types/invoice'
import {
  formatInvoicePeriod,
  invoiceStatusLabels,
} from '@/types/invoice'
import { formatKopeks } from '@/lib/formatters'
import { mockInvoiceDetails } from '@/lib/mock-invoice-details'

const categoryLabels: Record<NewsCategory, string> = {
  announcement: 'Объявление',
  protocol: 'Протокол',
  notification: 'Уведомление',
}

const categoryVariants: Record<NewsCategory, string> = {
  announcement: 'warning',
  protocol: 'info',
  notification: 'success',
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getMonthDates(year: number, month: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

function generateDashboardInvoices(): Invoice[] {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1

  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  const prevM = m === 1 ? 12 : m - 1
  const prevY = m === 1 ? y - 1 : y

  const amount = mockInvoiceDetails.totalToPay

  const nextDates = getMonthDates(nextY, nextM)
  const currDates = getMonthDates(y, m)
  const prevDates = getMonthDates(prevY, prevM)

  return [
    {
      id: `dash-inv-${nextY}-${String(nextM).padStart(2, '0')}`,
      invoiceNumber: `INV-${nextY}${String(nextM).padStart(2, '0')}-001`,
      accountId: 'mock-account-id',
      contractId: null,
      status: 'pending',
      amount,
      description: 'Ежемесячная плата за интернет',
      periodStart: nextDates.start,
      periodEnd: nextDates.end,
      issuedAt: new Date(nextY, nextM - 1, 1).toISOString(),
      dueDate: new Date(nextY, nextM, 0).toISOString(),
      paidAt: null,
      createdAt: new Date(nextY, nextM - 1, 1).toISOString(),
      updatedAt: new Date(nextY, nextM - 1, 1).toISOString(),
    },
    {
      id: `dash-inv-${y}-${String(m).padStart(2, '0')}`,
      invoiceNumber: `INV-${y}${String(m).padStart(2, '0')}-001`,
      accountId: 'mock-account-id',
      contractId: null,
      status: 'paid',
      amount,
      description: 'Ежемесячная плата за интернет',
      periodStart: currDates.start,
      periodEnd: currDates.end,
      issuedAt: new Date(y, m - 1, 1).toISOString(),
      dueDate: new Date(y, m, 0).toISOString(),
      paidAt: new Date(y, m - 1, 10).toISOString(),
      createdAt: new Date(y, m - 1, 1).toISOString(),
      updatedAt: new Date(y, m - 1, 10).toISOString(),
    },
    {
      id: `dash-inv-${prevY}-${String(prevM).padStart(2, '0')}`,
      invoiceNumber: `INV-${prevY}${String(prevM).padStart(2, '0')}-001`,
      accountId: 'mock-account-id',
      contractId: null,
      status: 'paid',
      amount,
      description: 'Ежемесячная плата за интернет',
      periodStart: prevDates.start,
      periodEnd: prevDates.end,
      issuedAt: new Date(prevY, prevM - 1, 1).toISOString(),
      dueDate: new Date(prevY, prevM, 0).toISOString(),
      paidAt: new Date(prevY, prevM - 1, 15).toISOString(),
      createdAt: new Date(prevY, prevM - 1, 1).toISOString(),
      updatedAt: new Date(prevY, prevM - 1, 15).toISOString(),
    },
  ]
}

const UNPAID_STATUSES = ['pending', 'sent', 'viewed', 'expired']

const dashboardInvoices = generateDashboardInvoices()

export function DashboardView() {
  const [news, setNews] = useState<News[]>([])
  const [pending, setPending] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNewsId, setSelectedNewsId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setPending(true)
    setError(null)
    fetch('/api/news?active=true')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.news) {
          setNews(data.news.slice(0, 3))
        }
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить новости')
      })
      .finally(() => {
        if (!cancelled) setPending(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <DashboardBalanceCard />

      <UiCard hover>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="mb-1 text-sm text-[var(--text-muted)]">Счета</p>
          </div>
          <Link
            href="/invoices"
            className="text-sm font-medium text-primary hover:underline"
          >
            Все счета &rarr;
          </Link>
        </div>

        <div className="space-y-4">
          {dashboardInvoices.map((invoice, index) => {
            const isUnpaid = UNPAID_STATUSES.includes(invoice.status)
            return (
              <div key={invoice.id} className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                        isUnpaid
                          ? 'bg-gradient-to-br from-primary/20 to-secondary/10'
                          : 'bg-accent/10'
                      }`}
                    >
                      {isUnpaid ? (
                        <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium capitalize text-[var(--text-primary)]">
                        {formatInvoicePeriod(invoice)}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-[var(--text-muted)]">
                          {invoice.invoiceNumber}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            isUnpaid
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-accent/20 text-accent'
                          }`}
                        >
                          {invoiceStatusLabels[invoice.status]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-[var(--text-primary)]">
                    {formatKopeks(invoice.amount)}
                    <span className="text-sm font-normal text-[var(--text-muted)]"> ₽</span>
                  </span>
                </div>
                {index < dashboardInvoices.length - 1 && (
                  <div
                    className="border-t"
                    style={{ borderColor: 'var(--glass-border)' }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </UiCard>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Новости сообщества
          </h2>
        </div>

        {pending && (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <UiCard key={i} className="animate-pulse p-5">
                <div className="mb-2 h-3 w-20 rounded bg-white/10" />
                <div className="mb-2 h-5 w-full rounded bg-white/10" />
                <div className="h-4 w-full rounded bg-white/10" />
              </UiCard>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-center text-red-400">{error}</p>
          </div>
        )}

        {!pending && !error && news.length === 0 && (
          <div className="rounded-lg bg-white/5 p-8 text-center">
            <p className="text-[var(--text-muted)]">Новостей пока нет</p>
          </div>
        )}

        {!pending && !error && news.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            {news.map((item) => (
              <UiCard
                key={item.id}
                hover
                className="cursor-pointer transition-transform hover:scale-[1.02]"
                onClick={() => setSelectedNewsId(item.id)}
              >
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatDateShort(item.publishedAt)}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      categoryVariants[item.category] === 'warning'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : categoryVariants[item.category] === 'info'
                          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          : 'bg-green-500/20 text-green-600 dark:text-green-400'
                    }`}
                  >
                    {categoryLabels[item.category]}
                  </span>
                </div>
                <h3 className="mb-2 font-medium text-[var(--text-primary)]">
                  {item.title}
                </h3>
                <p className="line-clamp-2 text-sm text-[var(--text-secondary)]">
                  {item.summary || item.content.substring(0, 100) + '...'}
                </p>
              </UiCard>
            ))}
          </div>
        )}

        {selectedNewsId && (
          <NewsModal
            newsId={selectedNewsId}
            onClose={() => setSelectedNewsId(null)}
          />
        )}
      </section>
    </div>
  )
}

function NewsModal({
  newsId,
  onClose,
}: { newsId: number; onClose: () => void }) {
  const [news, setNews] = useState<{ title: string; content: string } | null>(
    null
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/news/${newsId}`)
      .then((res) => res.json())
      .then((data) => setNews(data.news))
      .finally(() => setLoading(false))
  }, [newsId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--glass-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--glass-bg)]"
        >
          <span className="text-xl leading-none">&times;</span>
        </button>
        {loading && <p className="text-[var(--text-muted)]">Загрузка...</p>}
        {news && (
          <>
            <h2 className="pr-8 text-xl font-semibold text-[var(--text-primary)]">
              {news.title}
            </h2>
            <div
              className="mt-4 text-[var(--text-secondary)] whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: news.content }}
            />
          </>
        )}
      </div>
    </div>
  )
}
