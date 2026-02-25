/**
 * Типы для работы с Bitrix24 Open Lines API
 */

export interface Bitrix24ChatSession {
  id: string
  status: 'active' | 'waiting' | 'closed'
  operatorId?: string
  operatorName?: string
  createdAt: string
  // Данные для работы с Open Lines через виджет API
  hash?: string  // livechat_auth_id для отправки сообщений
  chatId?: string  // CHAT_ID для отправки сообщений
  dialogId?: string  // DIALOG_ID для получения сообщений
  userId?: string  // USER_ID от виджета
}

export interface Bitrix24ChatMessage {
  id: string
  text: string
  authorId: string
  authorName: string
  isOperator: boolean
  createdAt: string
  attachments?: Bitrix24Attachment[]
}

export interface Bitrix24Attachment {
  id: string
  name: string
  url: string
  type: 'image' | 'file'
  size: number
}
