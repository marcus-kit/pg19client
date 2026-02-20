/**
 * Типы лицевого счёта (контракта).
 * Account — номер договора, баланс (в копейках), статус (active/blocked),
 * тариф, адрес, дата начала.
 */
export type AccountStatus = 'active' | 'blocked'

export interface Account {
  contractNumber: number
  balance: number
  status: AccountStatus
  tariff: string
  address: string
  startDate: string
}
