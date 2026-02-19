'use client'

import { useMemo } from 'react'
import { useUserStore } from '@/store/use-user-store'
import { ProfilePersonalInfo } from '@/components/profile/profile-personal-info'
import { ProfileContactInfo } from '@/components/profile/profile-contact-info'
import { ProfileContractInfo } from '@/components/profile/profile-contract-info'
import { ProfileAddressInfo } from '@/components/profile/profile-address-info'

const profileFields = [
  { name: 'Фото', filled: (u: { avatar?: string | null }) => !!u?.avatar, points: 10 },
  { name: 'Имя', filled: (u: { firstName?: string }) => !!u?.firstName, points: 10 },
  { name: 'Фамилия', filled: (u: { lastName?: string }) => !!u?.lastName, points: 10 },
  { name: 'Отчество', filled: (u: { middleName?: string }) => !!u?.middleName, points: 5 },
  { name: 'Дата рождения', filled: (u: { birthDate?: string | null }) => !!u?.birthDate, points: 10 },
  { name: 'Телефон', filled: (u: { phone?: string }) => !!u?.phone, points: 15 },
  { name: 'Email', filled: (u: { email?: string }) => !!u?.email, points: 15 },
  { name: 'Telegram', filled: (u: { telegramId?: string | null }) => !!u?.telegramId, points: 10 },
  { name: 'VK ID', filled: (u: { vkId?: string }) => !!u?.vkId, points: 15 },
]

function getLevelInfo(percent: number) {
  if (percent >= 100) return { level: 'Мастер', color: 'from-yellow-400 to-amber-500' }
  if (percent >= 80) return { level: 'Эксперт', color: 'from-purple-400 to-purple-600' }
  if (percent >= 50) return { level: 'Продвинутый', color: 'from-blue-400 to-blue-600' }
  return { level: 'Новичок', color: 'from-gray-400 to-gray-600' }
}

export default function ProfilePage() {
  const user = useUserStore((s) => s.user)
  const { completedPoints, totalPoints, percent, levelInfo } = useMemo(() => {
    const total = profileFields.reduce((s, f) => s + f.points, 0)
    const completed = profileFields
      .filter((f) => f.filled(user ?? {}))
      .reduce((s, f) => s + f.points, 0)
    const pct = total ? Math.round((completed / total) * 100) : 0
    return {
      completedPoints: completed,
      totalPoints: total,
      percent: pct,
      levelInfo: getLevelInfo(pct),
    }
  }, [user])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Профиль</h1>
        <p className="mt-1 text-[var(--text-muted)]">Управление личными данными</p>
      </div>

      <div className="rounded-2xl p-4 md:p-6" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--text-primary)]">Заполненность профиля</span>
          <span className="text-sm text-[var(--text-muted)]">
            {completedPoints} / {totalPoints}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--glass-border)' }}>
          <div
            className={`h-full rounded-full bg-gradient-to-r ${levelInfo.color} transition-all duration-500`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">Уровень: {levelInfo.level}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ProfilePersonalInfo />
        <ProfileContactInfo />
      </div>
      <ProfileContractInfo />
      <ProfileAddressInfo />
    </div>
  )
}
