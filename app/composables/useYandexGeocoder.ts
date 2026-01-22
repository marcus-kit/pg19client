import { VueYandexMaps, initYmaps } from 'vue-yandex-maps'

export interface GeocoderResult {
  address: string
  coordinates: [number, number] // [lat, lon]
  components: {
    city?: string
    street?: string
    house?: string
    region?: string
    country?: string
  }
  precision: string // 'exact' | 'street' | 'other'
}

interface YmapsSearchResult {
  geometry?: { coordinates?: [number, number] }
  properties?: { name?: string; description?: string }
}

let initPromise: Promise<void> | null = null

/**
 * Убедиться что Yandex Maps API загружен
 */
async function ensureYmapsLoaded(): Promise<boolean> {
  if (VueYandexMaps.isLoaded.value) {
    return true
  }

  if (initPromise) {
    await initPromise
    return VueYandexMaps.isLoaded.value
  }

  try {
    initPromise = initYmaps()
    await initPromise
    return VueYandexMaps.isLoaded.value
  } catch (e) {
    console.error('Failed to init Yandex Maps:', e)
    return false
  }
}

/**
 * Парсит компоненты адреса из результата Yandex Maps
 */
function parseAddressComponents(properties: YmapsSearchResult['properties']): GeocoderResult['components'] {
  const components: GeocoderResult['components'] = {}

  if (properties?.description) {
    const desc = properties.description
    if (desc.includes('Ростов-на-Дону')) components.city = 'Ростов-на-Дону'
    if (desc.includes('Ростовская область')) components.region = 'Ростовская область'
    if (desc.includes('Россия')) components.country = 'Россия'
  }

  if (properties?.name) {
    const nameParts = properties.name.split(',').map((s: string) => s.trim())
    if (nameParts.length >= 2) {
      components.street = nameParts[0]
      components.house = nameParts[1]
    } else {
      components.street = properties.name
    }
  }

  return components
}

/**
 * Форматирует полный адрес из результата Yandex Maps
 */
function formatFullAddress(properties: YmapsSearchResult['properties']): string {
  const name = properties?.name || ''
  const description = properties?.description || ''
  return `${name}, ${description}`.replace(/^, |, $/g, '')
}

/**
 * Создаёт GeocoderResult из результата поиска Yandex Maps
 */
function createGeocoderResult(searchResult: YmapsSearchResult, fallbackCoords: [number, number]): GeocoderResult {
  const coords = searchResult.geometry?.coordinates || fallbackCoords
  const [lon, lat] = coords
  const properties = searchResult.properties || {}

  return {
    address: formatFullAddress(properties),
    coordinates: [lat, lon],
    components: parseAddressComponents(properties),
    precision: 'exact'
  }
}

export function useYandexGeocoder() {
  const result = ref<GeocoderResult | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Прямое геокодирование: адрес -> координаты
   */
  async function geocodeAddress(address: string): Promise<GeocoderResult> {
    isLoading.value = true
    error.value = null

    try {
      const loaded = await ensureYmapsLoaded()
      if (!loaded) {
        throw new Error('Yandex Maps API not loaded')
      }

      const ymaps = VueYandexMaps.ymaps()
      const searchResult = await ymaps.search({
        text: address,
        bounds: [[38.0, 46.5], [44.0, 50.5]] as unknown as [[number, number], [number, number]]
      })

      if (!searchResult || searchResult.length === 0) {
        throw new Error('Адрес не найден')
      }

      const firstResult = searchResult[0]
      if (!firstResult) {
        throw new Error('Адрес не найден')
      }

      const geocodeResult = createGeocoderResult(firstResult, [0, 0])
      result.value = geocodeResult
      return geocodeResult
    } catch (e: unknown) {
      const err = e as Error
      console.error('Geocoder error:', err)
      error.value = err.message || 'Ошибка при геокодировании адреса'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Обратное геокодирование: координаты -> адрес
   */
  async function reverseGeocode(lat: number, lon: number): Promise<GeocoderResult> {
    isLoading.value = true
    error.value = null

    try {
      const loaded = await ensureYmapsLoaded()
      if (!loaded) {
        throw new Error('Yandex Maps API not loaded')
      }

      const ymaps = VueYandexMaps.ymaps()
      const searchResult = await ymaps.search({
        text: `${lon},${lat}`
      })

      if (!searchResult || searchResult.length === 0) {
        throw new Error('Адрес не найден для указанных координат')
      }

      const firstResult = searchResult[0]
      if (!firstResult) {
        throw new Error('Адрес не найден для указанных координат')
      }

      const geocodeResult = createGeocoderResult(firstResult, [lon, lat])
      result.value = geocodeResult
      return geocodeResult
    } catch (e: unknown) {
      const err = e as Error
      console.error('Reverse geocoder error:', err)
      error.value = err.message || 'Ошибка при обратном геокодировании'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  return {
    result: readonly(result),
    isLoading: readonly(isLoading),
    error: readonly(error),
    geocodeAddress,
    reverseGeocode
  }
}
