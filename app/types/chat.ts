/**
 * Типы для системы чата поддержки
 */

// Типы отправителей
export type SenderType = 'user' | 'admin' | 'system' | 'bot'

// Типы контента сообщения
export type ContentType = 'text' | 'image' | 'file'

// Чат
export interface Chat {
  id: string
  user_id: string | null
  user_name: string | null
  guest_name: string | null
  guest_contact: string | null
  session_token: string | null
  status: 'active' | 'waiting' | 'processing' | 'closed' | 'resolved'
  assigned_to: string | null
  last_message_at: string | null
  unread_admin_count: number
  unread_user_count: number
  ai_summary: string | null
  source: string
  created_at: string
  updated_at: string
  // AI-бот поля
  is_bot_active: boolean
  bot_message_count: number
  escalated_at: string | null
  escalation_reason: string | null
}

// Сообщение чата
export interface ChatMessage {
  id: string
  chat_id: string
  sender_type: SenderType
  sender_id: string | null
  sender_name: string | null
  content: string
  content_type: ContentType
  // Вложения
  attachment_url: string | null
  attachment_name: string | null
  attachment_size: number | null
  // Статус
  is_read: boolean
  read_at: string | null
  created_at: string
}

// Запрос на создание/получение сессии
export interface SessionRequest {
  chatId?: string
  userId?: string
  guestName?: string
  guestContact?: string
}

// Информация о загруженном файле
export interface UploadedFile {
  url: string
  name: string
  size: number
  type: string
  isImage: boolean
}
