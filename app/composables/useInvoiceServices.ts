/**
 * Состав услуг счёта — типы и загрузка из API /api/invoices/[id]/details
 */

export interface InvoiceService {
  name: string
  price: number // в копейках
}

export interface InvoiceAddress {
  address: string
  services: InvoiceService[]
}

export interface InvoiceDetails {
  addresses: InvoiceAddress[]
  totalAmount: number // в копейках
  balance: number // в копейках
  totalToPay: number // в копейках
}

export function useInvoiceServices() {
  return {
    /** Загрузить детали счёта (адреса, услуги, суммы) из БД */
    async fetchInvoiceDetails(invoiceId: string): Promise<InvoiceDetails> {
      const data = await $fetch<InvoiceDetails>(`/api/invoices/${encodeURIComponent(invoiceId)}/details`)
      return data
    }
  }
}
