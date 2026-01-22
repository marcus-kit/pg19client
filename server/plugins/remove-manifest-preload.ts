// Nitro плагин для удаления preload ссылки на builds/meta
// html.head[0] содержит все теги в одной строке, делаем замену
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html) => {
    if (html.head && Array.isArray(html.head)) {
      html.head = html.head.map(item => {
        if (typeof item === 'string') {
          // Удаляем только preload ссылки на builds/meta
          // Паттерн: <link rel="preload" ... href="/_nuxt/builds/meta/..." ... >
          return item.replace(/<link[^>]*rel="preload"[^>]*builds\/meta[^>]*>/gi, '')
        }
        return item
      })
    }
  })
})
