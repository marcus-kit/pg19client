import { setCookie, getCookie } from 'h3'
import crypto from 'crypto'
import type { Chat, SessionRequest } from '~/types/chat'

const CHAT_SESSION_COOKIE = 'pg19_chat_session'

export default defineEventHandler(async (event) => {
  const body = await readBody<SessionRequest>(event)
  const prisma = usePrisma()

  const sessionUser = await getUserFromSession(event)
  const chatSessionToken = getCookie(event, CHAT_SESSION_COOKIE)

  if (body.chatId) {
    const existingChat = await prisma.chat.findFirst({
      where: {
        id: body.chatId,
        status: { in: ['active', 'waiting'] }
      }
    })

    if (existingChat) {
      if (existingChat.user_id) {
        if (!sessionUser || sessionUser.id !== existingChat.user_id) {
          throw createError({
            statusCode: 403,
            message: 'Нет доступа к этому чату'
          })
        }
      } else {
        if (!chatSessionToken || chatSessionToken !== existingChat.session_token) {
          throw createError({
            statusCode: 403,
            message: 'Нет доступа к этому чату'
          })
        }
      }

      return {
        session: existingChat as unknown as Chat,
        isNew: false
      }
    }
  }

  if (sessionUser) {
    const existingChat = await prisma.chat.findFirst({
      where: {
        user_id: sessionUser.id,
        status: { in: ['active', 'waiting'] }
      },
      orderBy: { created_at: 'desc' }
    })

    if (existingChat) {
      return {
        session: existingChat as unknown as Chat,
        isNew: false
      }
    }
  }

  const chatData: {
    status: string
    user_id?: string
    user_name?: string
    guest_name?: string
    guest_contact?: string | null
    session_token?: string
  } = {
    status: 'waiting'
  }

  if (sessionUser) {
    chatData.user_id = sessionUser.id
    chatData.user_name =
      sessionUser.full_name ||
      [sessionUser.first_name, sessionUser.last_name].filter(Boolean).join(' ') ||
      sessionUser.email ||
      'Пользователь'
  } else {
    if (!body.guestName?.trim()) {
      throw createError({
        statusCode: 400,
        message: 'Укажите имя'
      })
    }
    const newSessionToken = crypto.randomBytes(32).toString('hex')
    chatData.guest_name = body.guestName.trim()
    chatData.guest_contact = body.guestContact?.trim() || null
    chatData.session_token = newSessionToken

    setCookie(event, CHAT_SESSION_COOKIE, newSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    })
  }

  const newChat = await prisma.chat.create({
    data: chatData
  })

  return {
    session: newChat as unknown as Chat,
    isNew: true
  }
})
