/**
 * Типы сессий входа
 *
 * LoginSession — информация о сессии: устройство, браузер, IP, геолокация
 */
export interface LoginSession {
  id: string
  device: string
  browser: string
  ip: string
  location: string
  lastActive: string
  current: boolean
}
