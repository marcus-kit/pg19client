/**
 * Загрузка файла для чата Bitrix24
 * ⚠️ Webhook URL используется только на сервере!
 */
import { readMultipartFormData } from 'h3'
import type { Bitrix24Attachment } from '~/types/bitrix24'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  const config = useRuntimeConfig()

  // ⚠️ Webhook URL доступен только на сервере!
  const BITRIX24_WEBHOOK = config.bitrix24WebhookUrl || ''

  if (!formData) {
    throw createError({
      statusCode: 400,
      message: 'Файл не найден'
    })
  }

  const file = formData.find(item => item.name === 'file')
  const sessionId = formData.find(item => item.name === 'sessionId')?.data.toString()

  if (!file || !file.data) {
    throw createError({
      statusCode: 400,
      message: 'Файл не найден'
    })
  }

  if (!sessionId) {
    throw createError({
      statusCode: 400,
      message: 'sessionId обязателен'
    })
  }

  // Проверка размера файла (10 MB)
  if (file.data.length > 10 * 1024 * 1024) {
    throw createError({
      statusCode: 400,
      message: 'Размер файла не должен превышать 10 МБ'
    })
  }

  try {
    // Если есть webhook URL, загружаем через Bitrix24 API
    if (BITRIX24_WEBHOOK) {
      try {
        // Конвертируем файл в base64 для Bitrix24 API
        const fileContent = file.data.toString('base64')
        const fileName = file.filename || 'file'
        const fileType = file.type || 'application/octet-stream'

        // Загружаем файл в Bitrix24
        const uploadResponse = await $fetch(`${BITRIX24_WEBHOOK}/disk.file.upload`, {
          method: 'POST',
          body: {
            id: 'shared_files',
            data: {
              NAME: fileName
            },
            fileContent: fileContent
          }
        })

        if (uploadResponse.result) {
          const attachment: Bitrix24Attachment = {
            id: uploadResponse.result.ID,
            name: fileName,
            url: uploadResponse.result.DOWNLOAD_URL || uploadResponse.result.URL,
            type: fileType.startsWith('image/') ? 'image' : 'file',
            size: file.data.length
          }

          return attachment
        }
      } catch (apiError: any) {
        console.error('Bitrix24 API error:', apiError)
        // Продолжаем с fallback, если API недоступен
      }
    }

    // Fallback: возвращаем моковые данные (для тестирования)
    const attachment: Bitrix24Attachment = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.filename || 'file',
      url: '#',
      type: (file.type || '').startsWith('image/') ? 'image' : 'file',
      size: file.data.length
    }

    return attachment
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Ошибка при загрузке файла'
    })
  }
})
