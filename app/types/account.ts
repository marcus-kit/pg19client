/**
 * Типы лицевого счёта
 *
 * AccountStatus — статус: active, blocked
 * Account — данные ЛС: баланс, тариф, адрес
 */
export type AccountStatus = 'active' | 'blocked'

export interface Account {
  contractNumber: number
  balance: number
  status: AccountStatus
  tariff: string
  address: string
  startDate: string
  /** День месяца для оплаты (1–31), для блока «Следующая оплата» */
  payDay?: number
}
