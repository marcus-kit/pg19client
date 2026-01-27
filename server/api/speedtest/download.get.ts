// GET /api/speedtest/download
// Прокси для теста скорости загрузки (download)
// Параметры: size - размер данных в байтах

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const size = query.size ? parseInt(query.size as string) : 1000000 // 1MB по умолчанию
  
  try {
    const startTime = Date.now()
    
    // Загружаем данные с сервера
    const response = await fetch(`http://85.198.120.6/backend/garbage.php?size=${size}`, {
      method: 'GET',
      headers: {
        'User-Agent': getHeader(event, 'user-agent') || 'Mozilla/5.0',
      }
    })

    if (!response.ok) {
      throw createError({ statusCode: response.status, message: 'Failed to download' })
    }

    // Читаем данные потоком для измерения скорости
    const reader = response.body?.getReader()
    if (!reader) {
      throw createError({ statusCode: 500, message: 'No response body' })
    }

    let totalBytes = 0
    const chunks: Uint8Array[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        totalBytes += value.length
        chunks.push(value)
      }
    }

    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000 // в секундах
    
    // Вычисляем скорость в Мбит/с (мегабиты в секунду)
    // totalBytes * 8 (биты) / duration (секунды) / 1000000 (мегабиты)
    const speedMbps = duration > 0 ? (totalBytes * 8) / (duration * 1000000) : 0

    setHeader(event, 'Access-Control-Allow-Origin', '*')
    setHeader(event, 'Content-Type', 'application/json')
    
    return {
      bytes: totalBytes,
      duration,
      speedMbps: Math.round(speedMbps * 100) / 100
    }
  } catch (error: any) {
    throw createError({ statusCode: 500, message: error.message || 'Failed to download' })
  }
})
