import { validateConfig } from '../utils/config'

/**
 * Nitro plugin для валидации конфигурации при старте сервера
 * Выполняется один раз при инициализации
 */
export default defineNitroPlugin(() => {
  validateConfig()
})
