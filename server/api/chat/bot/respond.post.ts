/**
 * Внутренний endpoint для генерации ответа AI-бота
 *
 * Вызывается из /api/chat/send после сохранения сообщения пользователя.
 * Не должен вызываться напрямую клиентом.
 */

import type { AIBotSettings, RAGSource } from '~/server/utils/openai'
import type { Chat } from '~/types/chat'

interface RespondRequest {
  chatId: string
  messageId: string
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

  const supabase = useSupabaseServer()

  // 1. Загружаем настройки бота
  const { data: settings } = await supabase
    .from('ai_bot_settings')
    .select('*')
    .single()

  if (!settings || !settings.is_enabled) {
    return { skipped: true, reason: 'bot_disabled' }
  }

  const botSettings = settings as AIBotSettings

  // 2. Загружаем чат
  const { data: chat } = await supabase
    .from('chats')
    .select('id, is_bot_active, bot_message_count, status')
    .eq('id', body.chatId)
    .single()

  if (!chat) {
    return { skipped: true, reason: 'chat_not_found' }
  }

  const chatData = chat as Chat

  // Проверяем что бот активен для этого чата
  if (!chatData.is_bot_active) {
    return { skipped: true, reason: 'bot_not_active_for_chat' }
  }

  // Проверяем статус чата
  if (chatData.status === 'closed') {
    return { skipped: true, reason: 'chat_closed' }
  }

  // 3. Загружаем сообщение пользователя
  const { data: userMessage } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('id', body.messageId)
    .single()

  if (!userMessage) {
    return { skipped: true, reason: 'message_not_found' }
  }

  const userMessageContent = userMessage.content as string

  // 4. Проверяем на ключевые слова эскалации
  const lowerContent = userMessageContent.toLowerCase()
  const shouldEscalate = botSettings.escalation_keywords.some((keyword) =>
    lowerContent.includes(keyword.toLowerCase())
  )

  if (shouldEscalate) {
    // Эскалируем на оператора
    await supabase.rpc('escalate_chat_to_operator', {
      p_chat_id: body.chatId,
      p_reason: 'user_request'
    })

    return { escalated: true, reason: 'user_request' }
  }

  // 5. Проверяем лимит сообщений бота
  if (chatData.bot_message_count >= botSettings.max_bot_messages) {
    await supabase.rpc('escalate_chat_to_operator', {
      p_chat_id: body.chatId,
      p_reason: 'max_messages'
    })

    return { escalated: true, reason: 'max_messages' }
  }

  // 6. Загружаем историю диалога (последние 10 сообщений для контекста)
  const { data: historyMessages } = await supabase
    .from('chat_messages')
    .select('sender_type, content')
    .eq('chat_id', body.chatId)
    .neq('id', body.messageId) // Исключаем текущее сообщение (добавим отдельно)
    .in('sender_type', ['user', 'bot', 'admin'])
    .order('created_at', { ascending: false })
    .limit(10)

  // Переворачиваем чтобы получить хронологический порядок
  const conversationHistory =
    historyMessages
      ?.reverse()
      .map((msg) => ({
        role: msg.sender_type === 'user' ? ('user' as const) : ('assistant' as const),
        content: msg.content as string
      })) || []

  // 7. RAG поиск (если включён)
  let ragContext: RAGSource[] = []

  if (botSettings.rag_enabled) {
    try {
      // Генерируем эмбеддинг для сообщения пользователя
      const embedding = await generateEmbedding(userMessageContent)

      // Поиск в базе знаний
      const { data: ragResults } = await supabase.rpc('search_knowledge_base', {
        query_embedding: embedding,
        match_threshold: botSettings.rag_match_threshold,
        match_count: botSettings.rag_match_count
      })

      if (ragResults) {
        ragContext = ragResults as RAGSource[]
      }
    } catch (ragError) {
      console.error('RAG search error:', ragError)
      // Продолжаем без RAG контекста
    }
  }

  // 8. Генерируем ответ бота
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

    // При ошибке эскалируем на оператора
    await supabase.rpc('escalate_chat_to_operator', {
      p_chat_id: body.chatId,
      p_reason: 'error'
    })

    return { escalated: true, reason: 'error' }
  }

  const latency = Date.now() - startTime

  // 9. Сохраняем сообщение бота (sender_name = имя оператора для маскировки)
  const { data: botMessage, error: msgError } = await supabase
    .from('chat_messages')
    .insert({
      chat_id: body.chatId,
      sender_type: 'bot',
      sender_name: botSettings.operator_name || 'Оператор',
      content: botResponse.response,
      content_type: 'text'
    })
    .select()
    .single()

  if (msgError) {
    console.error('Error saving bot message:', msgError)
    throw createError({
      statusCode: 500,
      message: 'Ошибка при сохранении ответа бота'
    })
  }

  // 10. Логируем в ai_bot_messages
  await supabase.from('ai_bot_messages').insert({
    chat_id: body.chatId,
    message_id: botMessage.id,
    user_message: userMessageContent,
    bot_response: botResponse.response,
    rag_sources: ragContext.map((r) => ({
      type: r.source_type,
      id: r.id,
      similarity: r.similarity,
      question: r.question.slice(0, 200), // Превью вопроса
      answer_preview: r.answer.slice(0, 200) // Превью ответа
    })),
    model: botSettings.model,
    prompt_tokens: botResponse.usage.prompt_tokens,
    completion_tokens: botResponse.usage.completion_tokens,
    latency_ms: latency
  })

  // 11. Обновляем счётчики чата
  await supabase
    .from('chats')
    .update({
      bot_message_count: chatData.bot_message_count + 1,
      unread_user_count: (chat as { unread_user_count?: number }).unread_user_count
        ? ((chat as { unread_user_count: number }).unread_user_count + 1)
        : 1,
      last_message_at: new Date().toISOString()
    })
    .eq('id', body.chatId)

  return {
    success: true,
    messageId: botMessage.id,
    latency_ms: latency,
    rag_sources_count: ragContext.length
  }
})
