'use client'

import { UiCard } from '@/components/ui/ui-card'
import { useUserStore } from '@/store/use-user-store'

export function ProfileContactInfo() {
  const user = useUserStore((s) => s.user)
  const isTelegramLinked = !!user?.telegramId

  const contacts = [
    { label: 'Телефон', value: user?.phone },
    { label: 'Email', value: user?.email },
    { label: 'Telegram', value: isTelegramLinked ? (user?.telegram || '@username') : null },
    { label: 'VK ID', value: user?.vkId },
  ]

  return (
    <UiCard className="!p-4">
      <h2 className="mb-3 text-base font-semibold text-[var(--text-primary)]">Контакты</h2>
      <div className="grid grid-cols-1 gap-y-2">
        {contacts.map((c, i) => (
          <div
            key={c.label}
            className="flex items-center justify-between py-1.5"
            style={
              i < contacts.length - 1
                ? { borderBottom: '1px solid var(--glass-border)' }
                : undefined
            }
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--text-muted)]">{c.label}</p>
              <p className="truncate text-sm text-[var(--text-primary)]" title={c.value ?? ''}>
                {c.value || 'Не указан'}
              </p>
            </div>
            {c.value && c.label !== 'Telegram' && (
              <span className="text-xs text-[var(--text-muted)]">Подтверждён</span>
            )}
            {c.label === 'Telegram' && isTelegramLinked && (
              <span className="text-xs text-[var(--text-muted)]">Привязан</span>
            )}
          </div>
        ))}
      </div>
    </UiCard>
  )
}
