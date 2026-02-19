'use client'

import { UiCard } from '@/components/ui/ui-card'
import { useUserStore } from '@/store/use-user-store'
import { formatDate } from '@/lib/formatters'

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
function CakeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
    </svg>
  )
}

export function ProfilePersonalInfo() {
  const user = useUserStore((s) => s.user)
  const formattedBirthDate = user?.birthDate
    ? new Date(user.birthDate).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null
  let age: number | null = null
  if (user?.birthDate) {
    const birth = new Date(user.birthDate)
    const today = new Date()
    age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  }
  const ageLabel =
    age == null
      ? ''
      : age % 100 >= 11 && age % 100 <= 14
        ? 'лет'
        : age % 10 === 1
          ? 'год'
          : age % 10 >= 2 && age % 10 <= 4
            ? 'года'
            : 'лет'

  const row = (label: string, value: string) => (
    <div
      className="flex items-center gap-2 py-1.5"
      style={{ borderBottom: '1px solid var(--glass-border)' }}
    >
      <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10">
        <UserIcon className="h-full w-full text-primary" />
      </div>
      <div>
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p className="text-sm text-[var(--text-primary)]">{value || '—'}</p>
      </div>
    </div>
  )

  return (
    <UiCard className="!p-4">
      <h2 className="mb-3 text-base font-semibold text-[var(--text-primary)]">Персональные данные</h2>
      <div className="grid grid-cols-1 gap-y-2">
        {row('Фамилия', user?.lastName ?? '')}
        {row('Имя', user?.firstName ?? '')}
        {row('Отчество', user?.middleName ?? '')}
        <div
          className="flex items-center gap-2 py-1.5"
          style={{ borderBottom: '1px solid var(--glass-border)' }}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10">
            <CakeIcon className="h-full w-full text-primary" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Дата рождения</p>
            <p className="text-sm text-[var(--text-primary)]">
              {formattedBirthDate ? (
                <>
                  {formattedBirthDate}
                  <span className="text-xs text-[var(--text-muted)]"> ({age} {ageLabel})</span>
                </>
              ) : (
                '—'
              )}
            </p>
          </div>
        </div>
      </div>
    </UiCard>
  )
}
