export type AccountStatus = 'active' | 'blocked'

export interface Account {
  contractNumber: number
  balance: number
  status: AccountStatus
  tariff: string
  address: string
  startDate: string
}
