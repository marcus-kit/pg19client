/**
 * GET /api/user/notifications
 * Заглушка: настройки уведомлений (при наличии БД — читать из неё).
 */
export default defineEventHandler(async (event) => {
  await requireUser(event)
  return {
    email: true,
    sms: false,
    push: true,
    telegram: true,
    payments: true,
    maintenance: true,
    promo: false,
    news: true
  }
})
