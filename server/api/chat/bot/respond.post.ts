/**
 * Внутренний endpoint для генерации ответа AI-бота.
 * Вызывается из /api/chat/send после сохранения сообщения пользователя.
 * Использует Prisma (client.chats, client.chat_messages, client.ai_bot_settings, client.ai_bot_messages).
 */

import type { AIBotSettings, RAGSource } from '../../../utils/openai'
import type { Chat } from '~/types/chat'
import { generateBotResponse } from '../../../utils/openai'

interface RespondRequest {
  chatId: string
  messageId: string
}

async function escalateChatToOperator(
  prisma: ReturnType<typeof usePrisma>,
  chatId: string,
  reason: string
) {
  await prisma.chat.update({
    where: { id: chatId },
    data: {
      status: 'processing',
      escalated_at: new Date(),
      escalation_reason: reason
    }
  })
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  const body = await readBody<RespondRequest>(event)

  if (!body.chatId || !body.messageId) {
    throw createError({
      statusCode: 400,
      message: 'chatId и messageId обязательны'
    })
  }

  const prisma = usePrisma()

  const settingsRow = await prisma.aiBotSettings.findFirst()

  if (!settingsRow || !settingsRow.is_enabled) {
    return { skipped: true, reason: 'bot_disabled' }
  }

  const escalationKeywords =
    typeof settingsRow.escalation_keywords === 'object' &&
    Array.isArray(settingsRow.escalation_keywords)
      ? (settingsRow.escalation_keywords as string[])
      : []

  const botSettings: AIBotSettings = {
    id: settingsRow.id,
    is_enabled: settingsRow.is_enabled,
    system_prompt: settingsRow.system_prompt || '',
    model: settingsRow.model || 'gpt-4o-mini',
    temperature: settingsRow.temperature ?? 0.7,
    max_tokens: settingsRow.max_tokens ?? 500,
    escalation_keywords: escalationKeywords,
    max_bot_messages: settingsRow.max_bot_messages,
    rag_enabled: settingsRow.rag_enabled,
    rag_match_threshold: settingsRow.rag_match_threshold ?? 0.7,
    rag_match_count: settingsRow.rag_match_count ?? 5,
    operator_name: settingsRow.operator_name,
    created_at: settingsRow.created_at.toISOString(),
    updated_at: settingsRow.updated_at.toISOString()
  }

  const chat = await prisma.chat.findUnique({
    where: { id: body.chatId },
    select: { id: true, is_bot_active: true, bot_message_count: true, status: true, unread_user_count: true }
  })

  if (!chat) {
    return { skipped: true, reason: 'chat_not_found' }
  }

  const chatData = chat as Chat & { unread_user_count: number }

  if (!chatData.is_bot_active) {
    return { skipped: true, reason: 'bot_not_active_for_chat' }
  }

  if (chatData.status === 'closed') {
    return { skipped: true, reason: 'chat_closed' }
  }

  const userMessage = await prisma.chatMessage.findUnique({
    where: { id: body.messageId }
  })

  if (!userMessage) {
    return { skipped: true, reason: 'message_not_found' }
  }

  const userMessageContent = userMessage.content

  const lowerContent = userMessageContent.toLowerCase()
  const shouldEscalate = botSettings.escalation_keywords.some((keyword) =>
    lowerContent.includes(keyword.toLowerCase())
  )

  if (shouldEscalate) {
    await escalateChatToOperator(prisma, body.chatId, 'user_request')
    return { escalated: true, reason: 'user_request' }
  }

  if (chatData.bot_message_count >= botSettings.max_bot_messages) {
    await escalateChatToOperator(prisma, body.chatId, 'max_messages')
    return { escalated: true, reason: 'max_messages' }
  }

  const historyMessages = await prisma.chatMessage.findMany({
    where: {
      chat_id: body.chatId,
      id: { not: body.messageId },
      sender_type: { in: ['user', 'bot', 'admin'] }
    },
    select: { sender_type: true, content: true },
    orderBy: { created_at: 'desc' },
    take: 10
  })

  const conversationHistory = [...historyMessages]
    .reverse()
    .map((msg) => ({
      role: (msg.sender_type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.content
    }))

  // RAG: search_knowledge_base в этой БД нет — контекст пустой
  const ragContext: RAGSource[] = []

  let botResponse: { response: string; usage: { prompt_tokens: number; completion_tokens: number } }

  try {
    botResponse = await generateBotResponse({
      systemPrompt: botSettings.system_prompt,
      userMessage: userMessageContent,
      ragContext: ragContext.map((r) => ({
        question: r.question,
        answer: r.answer,
        similarity: r.similarity,
        source_type: r.source_type
      })),
      conversationHistory,
      model: botSettings.model,
      temperature: Number(botSettings.temperature),
      maxTokens: botSettings.max_tokens
    })
  } catch (error) {
    console.error('Bot response generation error:', error)
    await escalateChatToOperator(prisma, body.chatId, 'error')
    return { escalated: true, reason: 'error' }
  }

  const latency = Date.now() - startTime

  const botMessage = await prisma.chatMessage.create({
    data: {
      chat_id: body.chatId,
      sender_type: 'bot',
      sender_name: botSettings.operator_name || 'Оператор',
      content: botResponse.response,
      content_type: 'text'
    }
  })

  await prisma.aiBotMessage.create({
    data: {
      chat_id: body.chatId,
      message_id: botMessage.id,
      user_message: userMessageContent,
      bot_response: botResponse.response,
      rag_sources: ragContext.map((r) => ({
        type: r.source_type,
        id: r.id,
        similarity: r.similarity,
        question: r.question.slice(0, 200),
        answer_preview: r.answer.slice(0, 200)
      })),
      model: botSettings.model,
      prompt_tokens: botResponse.usage.prompt_tokens,
      completion_tokens: botResponse.usage.completion_tokens,
      latency_ms: latency
    }
  })

  await prisma.chat.update({
    where: { id: body.chatId },
    data: {
      bot_message_count: chatData.bot_message_count + 1,
      unread_user_count: (chatData.unread_user_count ?? 0) + 1,
      last_message_at: new Date()
    }
  })

  return {
    success: true,
    messageId: botMessage.id,
    latency_ms: latency,
    rag_sources_count: ragContext.length
  }
})
