// POST /api/speedtest/telemetry
// Прокси для LibreSpeed telemetry (возвращает Test ID)

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    dl?: number
    ul?: number
    ping?: number
    jitter?: number
    ispinfo?: any
    extra?: string
    log?: string
  }>(event)

  const params = new URLSearchParams()
  params.set('dl', String(body.dl ?? ''))
  params.set('ul', String(body.ul ?? ''))
  params.set('ping', String(body.ping ?? ''))
  params.set('jitter', String(body.jitter ?? ''))
  params.set('ispinfo', typeof body.ispinfo === 'string' ? body.ispinfo : JSON.stringify(body.ispinfo ?? {}))
  params.set('extra', body.extra ?? '')
  params.set('log', body.log ?? '')

  const res = await fetch('http://85.198.120.6/results/telemetry.php?r=' + Math.random(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': getHeader(event, 'user-agent') || 'Mozilla/5.0'
    },
    body: params.toString()
  })

  if (!res.ok) {
    throw createError({ statusCode: res.status, message: 'Failed to send telemetry' })
  }

  const text = (await res.text()).trim()
  // формат ответа: "id xxxxx"
  const match = /^id\s+(.+)$/.exec(text)

  return {
    raw: text,
    testId: match?.[1] || null
  }
})

