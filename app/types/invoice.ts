// Статусы из billing.invoices
export type InvoiceStatus = 'pending' | 'sent' | 'viewed' | 'paid' | 'cancelled' | 'expired'

export interface Invoice {
  id: string // UUID
  invoiceNumber: string
  accountId: string // UUID
  contractId: string | null // UUID
  status: InvoiceStatus
  amount: number // в копейках
  description: string | null
  periodStart: string | null
  periodEnd: string | null
  issuedAt: string | null
  dueDate: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

// Формат периода для отображения (например, "Январь 2024")
export function formatInvoicePeriod(invoice: Invoice): string {
  if (!invoice.periodStart) return ''
  const date = new Date(invoice.periodStart)
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}

// Статусы для UI
export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  pending: 'Ожидает',
  sent: 'Отправлен',
  viewed: 'Просмотрен',
  paid: 'Оплачен',
  cancelled: 'Отменён',
  expired: 'Просрочен'
}

export const invoiceStatusColors: Record<InvoiceStatus, string> = {
  pending: 'gray',
  sent: 'primary',
  viewed: 'blue',
  paid: 'green',
  cancelled: 'gray',
  expired: 'red'
}
