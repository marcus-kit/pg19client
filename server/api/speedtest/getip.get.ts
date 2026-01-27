// GET /api/speedtest/getip
// Прокси для получения IP адреса пользователя

export default defineEventHandler(async (event) => {
  try {
    const response = await fetch('http://85.198.120.6/backend/getIP.php', {
      method: 'GET',
      headers: {
        'User-Agent': getHeader(event, 'user-agent') || 'Mozilla/5.0',
      }
    })

    if (!response.ok) {
      throw createError({ statusCode: response.status, message: 'Failed to get IP' })
    }

    const data = await response.json()
    
    // Возвращаем данные с CORS заголовками
    setHeader(event, 'Access-Control-Allow-Origin', '*')
    setHeader(event, 'Content-Type', 'application/json')
    
    return data
  } catch (error: any) {
    throw createError({ statusCode: 500, message: error.message || 'Failed to fetch IP' })
  }
})
