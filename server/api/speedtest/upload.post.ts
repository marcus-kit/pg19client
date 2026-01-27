// POST /api/speedtest/upload
// Прокси для теста скорости загрузки (upload)
// Body: { data: string } - данные для загрузки

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const data = body.data || ''
    const dataSize = new Blob([data]).size
    
    const startTime = Date.now()
    
    // Отправляем данные на сервер
    const response = await fetch('http://85.198.120.6/backend/empty.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'User-Agent': getHeader(event, 'user-agent') || 'Mozilla/5.0',
      },
      body: data
    })

    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000 // в секундах
    
    // Вычисляем скорость в Мбит/с (мегабиты в секунду)
    // dataSize * 8 (биты) / duration (секунды) / 1000000 (мегабиты)
    const speedMbps = duration > 0 ? (dataSize * 8) / (duration * 1000000) : 0

    if (!response.ok) {
      throw createError({ statusCode: response.status, message: 'Failed to upload' })
    }

    setHeader(event, 'Access-Control-Allow-Origin', '*')
    setHeader(event, 'Content-Type', 'application/json')
    
    return {
      bytes: dataSize,
      duration,
      speedMbps: Math.round(speedMbps * 100) / 100
    }
  } catch (error: any) {
    throw createError({ statusCode: 500, message: error.message || 'Failed to upload' })
  }
})
