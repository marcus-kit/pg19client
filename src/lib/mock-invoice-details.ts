import type { InvoiceDetails } from '@/types/invoice'

export const mockInvoiceDetails: InvoiceDetails = {
  addresses: [
    {
      address: 'обл Ростовская, г Таганрог, ул Ломоносова, д. 47',
      services: [
        { name: 'Ежемесячная плата за аренду участка сети (СПД)', price: 39900 },
        { name: 'Пакет "ИНТЕРНЕТ ПЖ19"', price: 30000 },
      ],
    },
    {
      address: 'обл Ростовская, г Таганрог, пер Каркасный, д. 9, кв. 16',
      services: [
        { name: 'Ежемесячная плата за аренду участка сети (СПД)', price: 39900 },
        { name: 'Пакет "ИНТЕРНЕТ ПЖ19"', price: 30000 },
      ],
    },
  ],
  totalAmount: 309500,
  balance: 0,
  totalToPay: 309500,
}
