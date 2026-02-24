/**
 * useMockInvoices — общая генерация моковых счетов для главной и страницы «Счета»
 */
import type { Invoice } from '~/types/invoice'
import { useInvoiceServices } from '~/composables/useInvoiceServices'

function getMonthDates(year: number, month: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return {
    start: start.toISOString().split('T')[0] || null,
    end: end.toISOString().split('T')[0] || null
  }
}

export function useMockInvoices() {
  const invoiceServices = useInvoiceServices()
  const invoiceDetailsData = invoiceServices.getInvoiceDetails('')

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const invoices = computed<Invoice[]>(() => {
    const mockInvoices: Invoice[] = []
    const totalToPay = invoiceDetailsData.totalToPay

    // 1 неоплаченный счёт за будущий месяц
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
    const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear
    const nextMonthDates = getMonthDates(nextMonthYear, nextMonth)

    mockInvoices.push({
      id: `mock-invoice-${nextMonthYear}-${String(nextMonth).padStart(2, '0')}`,
      invoiceNumber: `INV-${nextMonthYear}${String(nextMonth).padStart(2, '0')}-001`,
      accountId: 'mock-account-id',
      contractId: null,
      status: 'pending',
      amount: totalToPay,
      description: 'Ежемесячная плата за интернет',
      periodStart: nextMonthDates.start,
      periodEnd: nextMonthDates.end,
      issuedAt: new Date(nextMonthYear, nextMonth - 1, 1).toISOString(),
      dueDate: new Date(nextMonthYear, nextMonth, 0).toISOString(),
      paidAt: null,
      createdAt: new Date(nextMonthYear, nextMonth - 1, 1).toISOString(),
      updatedAt: new Date(nextMonthYear, nextMonth - 1, 1).toISOString()
    })

    // Текущий месяц — оплаченный
    const currentMonthDates = getMonthDates(currentYear, currentMonth)
    mockInvoices.push({
      id: `mock-invoice-${currentYear}-${String(currentMonth).padStart(2, '0')}`,
      invoiceNumber: `INV-${currentYear}${String(currentMonth).padStart(2, '0')}-001`,
      accountId: 'mock-account-id',
      contractId: null,
      status: 'paid',
      amount: totalToPay,
      description: 'Ежемесячная плата за интернет',
      periodStart: currentMonthDates.start,
      periodEnd: currentMonthDates.end,
      issuedAt: new Date(currentYear, currentMonth - 1, 1).toISOString(),
      dueDate: new Date(currentYear, currentMonth, 0).toISOString(),
      paidAt: new Date(currentYear, currentMonth - 1, 10).toISOString(),
      createdAt: new Date(currentYear, currentMonth - 1, 1).toISOString(),
      updatedAt: new Date(currentYear, currentMonth - 1, 10).toISOString()
    })

    // 9 оплаченных за предыдущие месяцы
    for (let i = 0; i < 9; i++) {
      let month = currentMonth - i - 1
      let year = currentYear
      while (month <= 0) {
        month += 12
        year -= 1
      }
      const monthDates = getMonthDates(year, month)
      const paidDate = new Date(year, month - 1, 10 + (i % 20))
      mockInvoices.push({
        id: `mock-invoice-${year}-${String(month).padStart(2, '0')}`,
        invoiceNumber: `INV-${year}${String(month).padStart(2, '0')}-001`,
        accountId: 'mock-account-id',
        contractId: null,
        status: 'paid',
        amount: totalToPay,
        description: 'Ежемесячная плата за интернет',
        periodStart: monthDates.start,
        periodEnd: monthDates.end,
        issuedAt: new Date(year, month - 1, 1).toISOString(),
        dueDate: new Date(year, month, 0).toISOString(),
        paidAt: paidDate.toISOString(),
        createdAt: new Date(year, month - 1, 1).toISOString(),
        updatedAt: paidDate.toISOString()
      })
    }

    return mockInvoices
  })

  /** Последние 3 счёта (в том же порядке, что на вкладке «Счета») */
  const lastThreeInvoices = computed(() => invoices.value.slice(0, 3))

  return {
    invoices,
    lastThreeInvoices
  }
}
