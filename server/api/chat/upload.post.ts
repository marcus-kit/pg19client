import { serverSupabaseServiceRole } from '#supabase/server'
import type { UploadedFile } from '~/types/chat'

// Допустимые MIME types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

export default defineEventHandler(async (event): Promise<UploadedFile> => {
  // Rate limiting: 10 файлов в 5 минут
  requireRateLimit(event, RATE_LIMIT_CONFIGS.form)

  // Read multipart form data
  const formData = await readFormData(event)
  const file = formData.get('file') as File
  const chatId = formData.get('chatId') as string

  if (!chatId) {
    throw createError({
      statusCode: 400,
      message: 'chatId обязателен'
    })
  }

  if (!file || !(file instanceof File)) {
    throw createError({
      statusCode: 400,
      message: 'Файл не загружен'
    })
  }

  // Validate file size (10 MB)
  if (file.size > 10 * 1024 * 1024) {
    throw createError({
      statusCode: 400,
      message: 'Размер файла не должен превышать 10 МБ'
    })
  }

  // Validate MIME type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw createError({
      statusCode: 400,
      message: 'Недопустимый тип файла. Разрешены: изображения (JPEG, PNG, GIF, WebP), PDF, Word, Excel'
    })
  }

  const prisma = usePrisma()
  const chat = await prisma.chat.findUnique({
    where: { id: chatId }
  })

  if (!chat) {
    throw createError({
      statusCode: 404,
      message: 'Чат не найден'
    })
  }

  if (chat.status === 'closed') {
    throw createError({
      statusCode: 400,
      message: 'Чат закрыт'
    })
  }

  const sessionUser = await getUserFromSession(event)

  if (!sessionUser) {
    throw createError({
      statusCode: 403,
      message: 'Загрузка файлов доступна только авторизованным пользователям'
    })
  }

  if (chat.user_id !== sessionUser.id) {
    throw createError({
      statusCode: 403,
      message: 'Нет доступа к этому чату'
    })
  }

  const supabase = serverSupabaseServiceRole(event)

  const timestamp = Date.now()
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const storagePath = `${chatId}/${timestamp}_${safeFileName}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false
    })

  if (uploadError) {
    console.error('Error uploading chat attachment:', uploadError)
    throw createError({
      statusCode: 500,
      message: 'Ошибка при загрузке файла'
    })
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(storagePath)

  return {
    url: urlData.publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
    isImage: file.type.startsWith('image/')
  }
})
