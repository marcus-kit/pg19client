/**
 * GET /api/user/achievements
 * Заглушка: в БД нет таблицы достижений — возвращаем пустой список.
 */
export default defineEventHandler(async (event) => {
  await requireUser(event)
  return [] as { id: string; title: string; description: string; icon: string; unlockedAt: string | null; progress?: number; maxProgress?: number }[]
})
