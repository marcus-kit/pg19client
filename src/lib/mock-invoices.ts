/**
 * Генерация моковых счетов для списка и дашборда.
 * generateMockInvoices() создаёт 10 счетов: 1 неоплаченный (следующий месяц)
 * + 9 оплаченных (предыдущие месяцы).
 * UNPAID_STATUSES — массив статусов, считающихся неоплаченными.
 * Используется на страницах /invoices и /dashboard.
 */
import type { Invoice, InvoiceStatus } from '@/types/invoice'
import { mockInvoiceDetails } from '@/lib/mock-invoice-details'

export const UNPAID_STATUSES: InvoiceStatus[] = ['pending', 'sent', 'viewed', 'expired']

function getMonthDates(year: number, month: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return {
    start: start.toISOString().split('T')[0] ?? null,
    end: end.toISOString().split('T')[0] ?? null,
  }
}

export function generateMockInvoices(): Invoice[] {
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
