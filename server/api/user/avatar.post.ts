import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const sessionUser = await requireUser(event)
  const userId = sessionUser.id

  const formData = await readFormData(event)
  const file = formData.get('file') as File

  if (!file || !(file instanceof File)) {
    throw createError({
      statusCode: 400,
      message: 'Файл не загружен'
    })
  }

  if (!file.type.startsWith('image/')) {
    throw createError({
      statusCode: 400,
      message: 'Только изображения разрешены'
    })
  }

  if (file.size > 5 * 1024 * 1024) {
    throw createError({
      statusCode: 400,
      message: 'Размер файла не должен превышать 5 МБ'
    })
  }

  const supabase = serverSupabaseServiceRole(event)

  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${userId}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: true
    })

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError)
    throw createError({
      statusCode: 500,
      message: 'Ошибка при загрузке файла'
    })
  }

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filename)

  const avatarUrl = urlData.publicUrl

  await usePrisma().user.update({
    where: { id: userId },
    data: { avatar: avatarUrl, updated_at: new Date() }
  })

  return {
    success: true,
    avatar: avatarUrl
  }
})
