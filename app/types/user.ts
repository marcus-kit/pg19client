/**
 * Типы пользователя
 *
 * UserRole — роль: user, admin, moderator
 * User — профиль пользователя с контактами и настройками
 */
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
