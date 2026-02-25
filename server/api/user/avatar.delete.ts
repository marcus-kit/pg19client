import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const sessionUser = await requireUser(event)
  const userId = sessionUser.id

  const prisma = usePrisma()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatar: true }
  })

  if (user?.avatar && user.avatar.includes('/avatars/')) {
    const filename = user.avatar.split('/avatars/').pop()
    if (filename) {
      const supabase = serverSupabaseServiceRole(event)
      await supabase.storage
        .from('avatars')
        .remove([filename])
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatar: null, updated_at: new Date() }
  })

  return { success: true }
})
