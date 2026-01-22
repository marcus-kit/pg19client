# Stores Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Разбить монолитный auth.ts (369 строк) на отдельные типы, composables для API и мелкие сторы.

**Architecture:** Types в `app/types/`, API вызовы в composables, сторы содержат только state и простые мутации. Каждый домен (user, account, notifications, sessions, achievements, referral) — отдельный модуль.

**Tech Stack:** Pinia, TypeScript, Nuxt 4

---

## Task 1: Создать типы в app/types/

**Files:**
- Create: `app/types/user.ts`
- Create: `app/types/account.ts`
- Create: `app/types/notifications.ts`
- Create: `app/types/session.ts`
- Create: `app/types/achievement.ts`
- Create: `app/types/referral.ts`
- Create: `app/types/index.ts`

**Step 1: Создать app/types/user.ts**

```typescript
export type UserRole = 'user' | 'admin' | 'moderator'

export interface User {
  id: string
  firstName: string
  lastName: string
  middleName: string
  phone: string
  email: string
  telegram: string
  telegramId: string | null
  vkId: string
  avatar: string | null
  birthDate: string | null
  nickname?: string | null
  role?: UserRole
}
```

**Step 2: Создать app/types/account.ts**

```typescript
export type AccountStatus = 'active' | 'blocked'

export interface Account {
  contractNumber: number
  balance: number
  status: AccountStatus
  tariff: string
  address: string
  startDate: string
}
```

**Step 3: Создать app/types/notifications.ts**

```typescript
export interface NotificationTypes {
  payments: boolean
  maintenance: boolean
  promotions: boolean
  news: boolean
}

export interface NotificationSettings {
  email: boolean
  sms: boolean
  push: boolean
  telegram: boolean
  types: NotificationTypes
}

export const defaultNotificationSettings: NotificationSettings = {
  email: false,
  sms: false,
  push: false,
  telegram: false,
  types: {
    payments: true,
    maintenance: true,
    promotions: false,
    news: false
  }
}
```

**Step 4: Создать app/types/session.ts**

```typescript
export interface LoginSession {
  id: string
  device: string
  browser: string
  ip: string
  location: string
  lastActive: string
  current: boolean
}
```

**Step 5: Создать app/types/achievement.ts**

```typescript
export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt: string | null
  progress?: number
  maxProgress?: number
}
```

**Step 6: Создать app/types/referral.ts**

```typescript
export interface Referral {
  id: string
  name: string
  registeredAt: string
  bonus: number
}

export interface ReferralProgram {
  code: string
  totalInvited: number
  totalBonus: number
  referrals: Referral[]
}
```

**Step 7: Создать app/types/index.ts**

```typescript
export * from './user'
export * from './account'
export * from './notifications'
export * from './session'
export * from './achievement'
export * from './referral'
```

**Step 8: Commit**

```bash
git add app/types/
git commit -m "refactor(types): extract auth store interfaces to app/types/"
```

---

## Task 2: Создать API composables

**Files:**
- Create: `app/composables/useNotificationsApi.ts`
- Create: `app/composables/useAchievementsApi.ts`
- Create: `app/composables/useSessionsApi.ts`
- Create: `app/composables/useReferralApi.ts`
- Create: `app/composables/useUserApi.ts`

**Step 1: Создать useNotificationsApi.ts**

```typescript
import type { NotificationSettings } from '~/types'
import { defaultNotificationSettings } from '~/types'

export function useNotificationsApi() {
  async function load(): Promise<NotificationSettings> {
    try {
      const data = await $fetch<Record<string, boolean>>('/api/user/notifications')
      return {
        email: data.email ?? true,
        sms: data.sms ?? false,
        push: data.push ?? true,
        telegram: data.telegram ?? true,
        types: {
          payments: data.payments ?? true,
          maintenance: data.maintenance ?? true,
          promotions: data.promo ?? false,
          news: data.news ?? true
        }
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
      return { ...defaultNotificationSettings }
    }
  }

  async function update(settings: Partial<NotificationSettings>): Promise<boolean> {
    try {
      const apiSettings: Record<string, boolean> = {}
      if (settings.email !== undefined) apiSettings.email = settings.email
      if (settings.sms !== undefined) apiSettings.sms = settings.sms
      if (settings.push !== undefined) apiSettings.push = settings.push
      if (settings.telegram !== undefined) apiSettings.telegram = settings.telegram
      if (settings.types?.payments !== undefined) apiSettings.payments = settings.types.payments
      if (settings.types?.maintenance !== undefined) apiSettings.maintenance = settings.types.maintenance
      if (settings.types?.promotions !== undefined) apiSettings.promo = settings.types.promotions
      if (settings.types?.news !== undefined) apiSettings.news = settings.types.news

      await $fetch('/api/user/notifications', {
        method: 'PUT',
        body: { settings: apiSettings }
      })
      return true
    } catch (error) {
      console.error('Failed to update notifications:', error)
      return false
    }
  }

  return { load, update }
}
```

**Step 2: Создать useAchievementsApi.ts**

```typescript
import type { Achievement } from '~/types'

export function useAchievementsApi() {
  async function load(userId: string): Promise<Achievement[]> {
    try {
      return await $fetch<Achievement[]>('/api/user/achievements', {
        query: { userId }
      })
    } catch (error) {
      console.error('Failed to load achievements:', error)
      return []
    }
  }

  return { load }
}
```

**Step 3: Создать useSessionsApi.ts**

```typescript
import type { LoginSession } from '~/types'

export function useSessionsApi() {
  async function load(userId: string): Promise<LoginSession[]> {
    try {
      return await $fetch<LoginSession[]>('/api/user/sessions', {
        query: { userId }
      })
    } catch (error) {
      console.error('Failed to load sessions:', error)
      return []
    }
  }

  async function terminate(sessionId: string): Promise<boolean> {
    try {
      await $fetch(`/api/user/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      return true
    } catch (error) {
      console.error('Failed to terminate session:', error)
      return false
    }
  }

  return { load, terminate }
}
```

**Step 4: Создать useReferralApi.ts**

```typescript
import type { ReferralProgram } from '~/types'

export function useReferralApi() {
  async function load(userId: string): Promise<ReferralProgram | null> {
    try {
      return await $fetch<ReferralProgram>('/api/user/referral', {
        query: { userId }
      })
    } catch (error) {
      console.error('Failed to load referral program:', error)
      return null
    }
  }

  return { load }
}
```

**Step 5: Создать useUserApi.ts**

```typescript
import type { User } from '~/types'

export function useUserApi() {
  async function update(userId: string, data: Partial<User>): Promise<User | null> {
    try {
      const response = await $fetch<{ success: boolean; user: User }>('/api/user/update', {
        method: 'POST',
        body: { userId, data }
      })
      return response.success ? response.user : null
    } catch (error) {
      console.error('Failed to update user:', error)
      return null
    }
  }

  return { update }
}
```

**Step 6: Commit**

```bash
git add app/composables/useNotificationsApi.ts app/composables/useAchievementsApi.ts app/composables/useSessionsApi.ts app/composables/useReferralApi.ts app/composables/useUserApi.ts
git commit -m "refactor(api): extract API calls to composables"
```

---

## Task 3: Создать новые сторы

**Files:**
- Create: `app/stores/user.ts`
- Create: `app/stores/account.ts`
- Create: `app/stores/notifications.ts`
- Create: `app/stores/sessions.ts`
- Create: `app/stores/achievements.ts`
- Create: `app/stores/referral.ts`

**Step 1: Создать stores/user.ts**

```typescript
import { defineStore } from 'pinia'
import type { User } from '~/types'

const STORAGE_KEY = 'pg19_user'

interface UserState {
  isAuthenticated: boolean
  user: User | null
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    isAuthenticated: false,
    user: null
  }),

  getters: {
    fullName: (state): string => {
      if (!state.user) return ''
      return `${state.user.lastName} ${state.user.firstName} ${state.user.middleName}`.trim()
    },

    shortName: (state): string => {
      if (!state.user) return ''
      const firstInitial = state.user.firstName.charAt(0)
      const middleInitial = state.user.middleName ? state.user.middleName.charAt(0) + '.' : ''
      return `${state.user.lastName} ${firstInitial}. ${middleInitial}`.trim()
    },

    isAdmin: (state): boolean => state.user?.role === 'admin',
    isModerator: (state): boolean => state.user?.role === 'moderator',
    hasAdminAccess: (state): boolean => state.user?.role === 'admin' || state.user?.role === 'moderator'
  },

  actions: {
    setUser(user: User) {
      this.user = user
      this.isAuthenticated = true
    },

    updateUser(data: Partial<User>) {
      if (this.user) {
        this.user = { ...this.user, ...data }
      }
    },

    logout() {
      this.isAuthenticated = false
      this.user = null
    }
  },

  persist: {
    key: STORAGE_KEY,
    pick: ['isAuthenticated', 'user']
  }
})
```

**Step 2: Создать stores/account.ts**

```typescript
import { defineStore } from 'pinia'
import type { Account } from '~/types'

const STORAGE_KEY = 'pg19_account'

interface AccountState {
  account: Account | null
}

export const useAccountStore = defineStore('account', {
  state: (): AccountState => ({
    account: null
  }),

  getters: {
    balanceRubles: (state): number => (state.account?.balance || 0) / 100,
    isBlocked: (state): boolean => state.account?.status === 'blocked',
    daysRemaining: (state): number => {
      if (!state.account) return 0
      const avgDailyCost = 1700
      return Math.max(0, Math.floor((state.account.balance || 0) / avgDailyCost))
    }
  },

  actions: {
    setAccount(account: Account) {
      this.account = account
    },

    clear() {
      this.account = null
    }
  },

  persist: {
    key: STORAGE_KEY,
    pick: ['account']
  }
})
```

**Step 3: Создать stores/notifications.ts**

```typescript
import { defineStore } from 'pinia'
import type { NotificationSettings } from '~/types'
import { defaultNotificationSettings } from '~/types'

const STORAGE_KEY = 'pg19_notifications'

interface NotificationsState {
  notifications: NotificationSettings
}

export const useNotificationsStore = defineStore('notifications', {
  state: (): NotificationsState => ({
    notifications: { ...defaultNotificationSettings }
  }),

  actions: {
    set(notifications: NotificationSettings) {
      this.notifications = notifications
    },

    update(settings: Partial<NotificationSettings>) {
      if (settings.types) {
        this.notifications = {
          ...this.notifications,
          ...settings,
          types: { ...this.notifications.types, ...settings.types }
        }
      } else {
        this.notifications = { ...this.notifications, ...settings }
      }
    },

    reset() {
      this.notifications = { ...defaultNotificationSettings }
    }
  },

  persist: {
    key: STORAGE_KEY,
    pick: ['notifications']
  }
})
```

**Step 4: Создать stores/sessions.ts**

```typescript
import { defineStore } from 'pinia'
import type { LoginSession } from '~/types'

interface SessionsState {
  sessions: LoginSession[]
}

export const useSessionsStore = defineStore('sessions', {
  state: (): SessionsState => ({
    sessions: []
  }),

  actions: {
    set(sessions: LoginSession[]) {
      this.sessions = sessions
    },

    remove(sessionId: string) {
      this.sessions = this.sessions.filter(s => s.id !== sessionId)
    },

    clear() {
      this.sessions = []
    }
  }
})
```

**Step 5: Создать stores/achievements.ts**

```typescript
import { defineStore } from 'pinia'
import type { Achievement } from '~/types'

interface AchievementsState {
  achievements: Achievement[]
}

export const useAchievementsStore = defineStore('achievements', {
  state: (): AchievementsState => ({
    achievements: []
  }),

  actions: {
    set(achievements: Achievement[]) {
      this.achievements = achievements
    },

    clear() {
      this.achievements = []
    }
  }
})
```

**Step 6: Создать stores/referral.ts**

```typescript
import { defineStore } from 'pinia'
import type { ReferralProgram } from '~/types'

interface ReferralState {
  referralProgram: ReferralProgram | null
}

export const useReferralStore = defineStore('referral', {
  state: (): ReferralState => ({
    referralProgram: null
  }),

  actions: {
    set(program: ReferralProgram | null) {
      this.referralProgram = program
    },

    clear() {
      this.referralProgram = null
    }
  }
})
```

**Step 7: Commit**

```bash
git add app/stores/user.ts app/stores/account.ts app/stores/notifications.ts app/stores/sessions.ts app/stores/achievements.ts app/stores/referral.ts
git commit -m "refactor(stores): split auth.ts into separate domain stores"
```

---

## Task 4: Создать composable для инициализации auth

**Files:**
- Create: `app/composables/useAuthInit.ts`

**Step 1: Создать useAuthInit.ts**

```typescript
import type { User, Account } from '~/types'

export function useAuthInit() {
  const userStore = useUserStore()
  const accountStore = useAccountStore()
  const notificationsStore = useNotificationsStore()
  const sessionsStore = useSessionsStore()
  const achievementsStore = useAchievementsStore()
  const referralStore = useReferralStore()

  async function init(user: User, account: Account) {
    // Set core data
    userStore.setUser(user)
    accountStore.setAccount(account)

    // Load additional data in parallel
    const [notifications, achievements, sessions, referral] = await Promise.all([
      useNotificationsApi().load(),
      useAchievementsApi().load(user.id),
      useSessionsApi().load(user.id),
      useReferralApi().load(user.id)
    ])

    notificationsStore.set(notifications)
    achievementsStore.set(achievements)
    sessionsStore.set(sessions)
    if (referral) referralStore.set(referral)
  }

  function logout() {
    userStore.logout()
    accountStore.clear()
    notificationsStore.reset()
    sessionsStore.clear()
    achievementsStore.clear()
    referralStore.clear()
  }

  async function refresh() {
    if (!userStore.isAuthenticated || !userStore.user?.id) return

    const userId = userStore.user.id
    const [notifications, achievements, sessions, referral] = await Promise.all([
      useNotificationsApi().load(),
      useAchievementsApi().load(userId),
      useSessionsApi().load(userId),
      useReferralApi().load(userId)
    ])

    notificationsStore.set(notifications)
    achievementsStore.set(achievements)
    sessionsStore.set(sessions)
    if (referral) referralStore.set(referral)
  }

  return { init, logout, refresh }
}
```

**Step 2: Commit**

```bash
git add app/composables/useAuthInit.ts
git commit -m "feat(auth): add useAuthInit composable for auth orchestration"
```

---

## Task 5: Обновить использования в компонентах

**Files:**
- Modify: `app/pages/login.vue`
- Modify: `app/pages/profile.vue`
- Modify: `app/pages/dashboard.vue`
- Modify: `app/middleware/auth.ts`
- Modify: `app/layouts/default.vue`
- Modify: все компоненты, использующие useAuthStore

**Step 1: Найти все использования useAuthStore**

```bash
grep -r "useAuthStore" app/ --include="*.vue" --include="*.ts" -l
```

**Step 2: Обновить каждый файл**

Заменить:
```typescript
// Было
const authStore = useAuthStore()
authStore.user
authStore.account
authStore.notifications

// Стало
const userStore = useUserStore()
const accountStore = useAccountStore()
const notificationsStore = useNotificationsStore()
userStore.user
accountStore.account
notificationsStore.notifications
```

**Step 3: Обновить login.vue**

Заменить вызов `authStore.setAuthData()` на `useAuthInit().init()`:

```typescript
// Было
await authStore.setAuthData(userData, accountData)

// Стало
await useAuthInit().init(userData, accountData)
```

**Step 4: Commit**

```bash
git add app/
git commit -m "refactor: migrate components from useAuthStore to new stores"
```

---

## Task 6: Удалить старый auth.ts

**Files:**
- Delete: `app/stores/auth.ts`

**Step 1: Убедиться, что нет использований**

```bash
grep -r "useAuthStore" app/ --include="*.vue" --include="*.ts"
```

Ожидаемый результат: пустой вывод

**Step 2: Удалить файл**

```bash
rm app/stores/auth.ts
```

**Step 3: Commit**

```bash
git add -u app/stores/auth.ts
git commit -m "refactor(stores): remove old monolithic auth.ts"
```

---

## Task 7: Очистка и проверка

**Step 1: Очистить кэш Nuxt**

```bash
rm -rf .nuxt
```

**Step 2: Запустить dev сервер**

```bash
pnpm dev
```

**Step 3: Проверить страницы**

- `/login` — авторизация работает
- `/dashboard` — данные отображаются
- `/profile` — все табы работают

**Step 4: Финальный коммит (если нужны исправления)**

```bash
git add .
git commit -m "fix: resolve any remaining store migration issues"
```

---

## Task 8: Обновить CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Обновить секцию Architecture**

```markdown
## Stores Architecture

**Принцип:** Разделение ответственностей
- **Types** (`app/types/`) — интерфейсы данных
- **API Composables** (`useXxxApi`) — вызовы API, возвращают данные
- **Stores** — только state и простые мутации
- **useAuthInit** — оркестрация инициализации/логаута

**Stores:**
- `user.ts` — isAuthenticated, user
- `account.ts` — account, balance
- `notifications.ts` — notification settings
- `sessions.ts` — login sessions
- `achievements.ts` — achievements
- `referral.ts` — referral program
- `chat.ts` — chat widget state
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with new stores architecture"
```

---

## Summary

| Task | Файлов | Описание |
|------|--------|----------|
| 1 | 7 | Создать типы в app/types/ |
| 2 | 5 | Создать API composables |
| 3 | 6 | Создать новые сторы |
| 4 | 1 | Создать useAuthInit |
| 5 | ~10 | Обновить компоненты |
| 6 | 1 | Удалить старый auth.ts |
| 7 | - | Очистка и проверка |
| 8 | 1 | Обновить CLAUDE.md |
