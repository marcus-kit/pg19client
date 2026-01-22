/**
 * Centralized formatting utilities
 * Available to all portals via Nuxt layer inheritance
 */

/**
 * Format date with relative time support
 * Shows "только что", "X мин. назад", "X ч. назад" for recent dates
 * Falls back to locale date string for older dates
 */
export function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'

  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // Less than a minute
  if (diff < 60000) return 'только что'

  // Less than an hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000)
    return `${mins} мин. назад`
  }

  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours} ч. назад`
  }

  // Same day - show time only
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  // Yesterday
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return 'вчера ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  // Other dates
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Format date with time for logs/history
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'

  const date = new Date(dateStr)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format date without time
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'

  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Format date short (for tables)
 */
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'

  const date = new Date(dateStr)
  const now = new Date()

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Format Russian phone number
 * Input: 79991234567 or +79991234567
 * Output: +7 (999) 123-45-67
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—'

  const digits = phone.replace(/\D/g, '')

  if (digits.length === 11) {
    return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
  }

  if (digits.length === 10) {
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`
  }

  return phone
}

/**
 * Format balance from kopeks to rubles
 * Input: 150050 (kopeks)
 * Output: "1 500,50 ₽"
 */
export function formatBalance(kopeks: number | null | undefined): string {
  if (kopeks === null || kopeks === undefined) return '—'

  return (kopeks / 100).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' ₽'
}

/**
 * Format price (already in rubles)
 */
export function formatPrice(rubles: number | null | undefined): string {
  if (rubles === null || rubles === undefined) return '—'

  return rubles.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }) + ' ₽'
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—'

  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} ГБ`
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string | null | undefined, maxLength: number = 100): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Format contract number
 */
export function formatContractNumber(number: number | null | undefined): string {
  if (number === null || number === undefined) return '—'
  return number.toString().padStart(6, '0')
}

// ==================== COMPOSABLE ====================

/**
 * Composable for accessing all formatters
 */
export function useFormatters() {
  return {
    formatRelativeDate,
    formatDateTime,
    formatDate,
    formatDateShort,
    formatPhone,
    formatBalance,
    formatPrice,
    formatFileSize,
    truncateText,
    formatContractNumber
  }
}
