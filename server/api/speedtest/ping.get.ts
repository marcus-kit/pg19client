// GET /api/speedtest/ping
// Прокси для ping теста (использует empty.php)

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const startTime = Date.now()
  
  try {
    const response = await fetch('http://85.198.120.6/backend/empty.php', {
      method: 'GET',
      headers: {
        'User-Agent': getHeader(event, 'user-agent') || 'Mozilla/5.0',
      }
    })

    const endTime = Date.now()
    const ping = endTime - startTime

    if (!response.ok) {
      throw createError({ statusCode: response.status, message: 'Failed to ping' })
    }

    // Возвращаем ping в миллисекундах
    setHeader(event, 'Access-Control-Allow-Origin', '*')
    setHeader(event, 'Content-Type', 'application/json')
    
    return { ping }
  } catch (error: any) {
    throw createError({ statusCode: 500, message: error.message || 'Failed to ping' })
  }
})
