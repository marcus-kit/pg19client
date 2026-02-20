/**
 * Типы счетов.
 * Invoice — счёт (номер, сумма в копейках, статус, период, даты).
 * InvoiceDetails — детализация с адресами и услугами.
 * Содержит утилиты: formatInvoicePeriod (форматирует период),
 * invoiceStatusLabels (русские названия статусов),
 * invoiceStatusColors (цвета бейджей).
 */
export type InvoiceStatus =
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'paid'
  | 'cancelled'
  | 'expired'

export interface Invoice {
  id: string
  invoiceNumber: string
  accountId: string
  contractId: string | null
  status: InvoiceStatus
  amount: number
  description: string | null
  periodStart: string | null
  periodEnd: string | null
  issuedAt: string | null
  dueDate: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export function formatInvoicePeriod(invoice: Invoice): string {
  if (!invoice.periodStart) return ''
  return new Date(invoice.periodStart).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  })
}

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  pending: 'Ожидает',
  sent: 'Отправлен',
  viewed: 'Просмотрен',
  paid: 'Оплачен',
  cancelled: 'Отменён',
  expired: 'Просрочен',
}

export const invoiceStatusColors: Record<InvoiceStatus, string> = {
  pending: 'gray',
  sent: 'primary',
  viewed: 'blue',
  paid: 'green',
  cancelled: 'gray',
  expired: 'red',
}

export interface InvoiceService {
  name: string
  price: number
}

export interface InvoiceAddress {
  address: string
  services: InvoiceService[]
}

export interface InvoiceDetails {
  addresses: InvoiceAddress[]
  totalAmount: number
  balance: number
  totalToPay: number
}
