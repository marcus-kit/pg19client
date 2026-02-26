/**
 * GET /api/user/referral
 * Заглушка: реферальная программа — при наличии БД вернуть данные.
 */
export default defineEventHandler(async (event) => {
  await requireUser(event)
  return {
    code: '',
    totalInvited: 0,
    totalBonus: 0,
    referrals: [] as { id: string; name: string; registeredAt: string; bonus: number }[]
  }
})
