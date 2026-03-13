export interface LegacyServiceInfo {
  price_id: string
  price_name: string
  status: string
  periodic_status: string
  cost_rub: string
}

export interface LegacyAddressInfo {
  address: string
  services: LegacyServiceInfo[]
}

export interface LegacyContractInfo {
  contract: string
  balance: string
  addresses: LegacyAddressInfo[]
  total: string
}

/**
 * Получает информацию о договоре (баланс, адреса, сервисы) из REST API старой системы.
 * Возвращает null при ошибке запроса.
 */
export async function fetchLegacyContractInfo(contractNumber: string): Promise<LegacyContractInfo | null> {
  try {
    return await $fetch<LegacyContractInfo>(`https://croko.tagan.ru/api/info/${contractNumber}`)
  } catch (err) {
    console.warn(`[legacyApi] Не удалось получить данные по договору ${contractNumber}:`, err)
    return null
  }
}
