/**
 * @file Страница поддержки (/support).
 *
 * Содержит две вкладки:
 * - «Чат с поддержкой» — пока является заглушкой (placeholder).
 * - «Частые вопросы» — FAQ, загружаемый GET-запросом с /api/support/faq.
 *   Элементы FAQ отображаются в виде раскрывающихся блоков (аккордеон).
 *
 * Также на странице есть модальное окно «Создать заявку»,
 * которое отправляет POST-запрос на /api/support/tickets
 * для создания новой заявки в службу поддержки.
 */
'use client'

import { useState, useEffect } from 'react'
import { UiCard } from '@/components/ui/ui-card'
import { UiButton } from '@/components/ui/ui-button'
import { UiInput } from '@/components/ui/ui-input'

interface FaqItem {
  id: number
  question: string
  answer: string
  category?: string
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}
function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

const categories = [
  { value: 'technical', label: 'Техническая проблема' },
  { value: 'billing', label: 'Вопрос по оплате' },
  { value: 'tariff', label: 'Смена тарифа' },
  { value: 'connection', label: 'Подключение' },
  { value: 'other', label: 'Другое' },
]

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'faq'>('faq')
  const [faq, setFaq] = useState<FaqItem[]>([])
  const [faqPending, setFaqPending] = useState(true)
  const [expandedFaqId, setExpandedFaqId] = useState<number | null>(null)
  const [showNewTicketModal, setShowNewTicketModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newTicket, setNewTicket] = useState({ category: '', subject: '', description: '' })

  useEffect(() => {
    setFaqPending(true)
    fetch('/api/support/faq')
      .then((r) => r.json())
      .then((d) => setFaq(d.faq || []))
      .finally(() => setFaqPending(false))
  }, [])

  const toggleFaq = (id: number) => setExpandedFaqId((prev) => (prev === id ? null : id))

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!newTicket.subject.trim() || !newTicket.description.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newTicket.subject,
          description: newTicket.description,
          category: newTicket.category || 'other',
        }),
      })
      if (res.ok) {
        setShowNewTicketModal(false)
        setNewTicket({ category: '', subject: '', description: '' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl font-bold text-[var(--text-primary)] md:text-2xl">Поддержка</h1>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'chat' ? 'bg-primary text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            style={activeTab !== 'chat' ? { background: 'var(--glass-bg)' } : undefined}
          >
            <ChatIcon className="h-5 w-5 flex-shrink-0" />
            Чат с поддержкой
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('faq')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'faq' ? 'bg-primary text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            style={activeTab !== 'faq' ? { background: 'var(--glass-bg)' } : undefined}
          >
            <QuestionIcon className="h-5 w-5 flex-shrink-0" />
            Частые вопросы
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowNewTicketModal(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors hover:text-primary"
          style={{ background: 'var(--glass-bg)', color: 'var(--text-primary)' }}
        >
          <span className="text-sm font-medium">Создать заявку</span>
          <PlusIcon className="h-4 w-4 flex-shrink-0" />
        </button>
      </div>

      {activeTab === 'chat' && (
        <UiCard className="flex flex-col items-center justify-center py-12">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--glass-bg)' }}>
            <ChatIcon className="h-6 w-6 text-primary" />
          </div>
          <h4 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">Чат с поддержкой</h4>
          <p className="text-center text-xs text-[var(--text-muted)]">
            Напишите ваш вопрос — оператор ответит в ближайшее время. Пока используйте раздел «Частые вопросы» или создайте заявку.
          </p>
        </UiCard>
      )}

      {activeTab === 'faq' && (
        <div className="space-y-2 md:space-y-3">
          {faqPending && (
            <div className="space-y-2 md:space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <UiCard key={i} className="animate-pulse p-3 md:p-5">
                  <div className="h-4 rounded bg-[var(--glass-bg)] md:h-5 w-3/4" />
                </UiCard>
              ))}
            </div>
          )}
          {!faqPending && faq.map((item) => (
            <UiCard
              key={item.id}
              className="cursor-pointer overflow-hidden p-0"
              onClick={() => toggleFaq(item.id)}
            >
              <div className="p-3 md:p-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] md:text-base">{item.question}</h3>
                  <ChevronDownIcon
                    className={`h-4 w-4 flex-shrink-0 text-[var(--text-muted)] transition-transform md:h-5 md:w-5 ${expandedFaqId === item.id ? 'rotate-180' : ''}`}
                  />
                </div>
                {expandedFaqId === item.id && (
                  <div className="mt-2 border-t pt-2 md:mt-3 md:pt-3" style={{ borderColor: 'var(--glass-border)' }}>
                    <p className="text-sm text-[var(--text-secondary)]">{item.answer}</p>
                  </div>
                )}
              </div>
            </UiCard>
          ))}
          {!faqPending && (
            <UiCard className="mt-4 p-4 md:mt-6 md:p-6">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary/10 md:mb-4 md:h-16 md:w-16">
                  <ChatIcon className="h-6 w-6 text-primary md:h-8 md:w-8" />
                </div>
                <h3 className="mb-1 text-base font-semibold text-[var(--text-primary)] md:mb-2 md:text-lg">Не нашли ответ?</h3>
                <p className="mb-3 text-xs text-[var(--text-muted)] md:mb-4 md:text-base">
                  Создайте заявку, и мы ответим в течение 15 минут
                </p>
                <UiButton size="sm" onClick={() => setShowNewTicketModal(true)}>
                  Создать заявку
                </UiButton>
              </div>
            </UiCard>
          )}
        </div>
      )}

      {showNewTicketModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowNewTicketModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--glass-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Новая заявка</h3>
              <button
                type="button"
                className="rounded-lg p-1 transition-colors hover:bg-[var(--glass-bg)]"
                onClick={() => setShowNewTicketModal(false)}
              >
                <CloseIcon className="h-5 w-5 text-[var(--text-muted)]" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={submitTicket}>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-muted)]">Категория</label>
                <select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket((t) => ({ ...t, category: e.target.value }))}
                  className="w-full rounded-xl border px-4 py-3 text-[var(--text-primary)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
                >
                  <option value="">Выберите категорию</option>
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <UiInput
                label="Тема"
                placeholder="Кратко опишите проблему"
                value={newTicket.subject}
                onChange={(e) => setNewTicket((t) => ({ ...t, subject: e.target.value }))}
                required
              />
              <div>
                <label className="mb-2 block text-sm text-[var(--text-muted)]">Сообщение</label>
                <textarea
                  rows={4}
                  placeholder="Подробно опишите вашу проблему или вопрос..."
                  value={newTicket.description}
                  onChange={(e) => setNewTicket((t) => ({ ...t, description: e.target.value }))}
                  className="w-full resize-none rounded-xl border px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <UiButton type="button" variant="secondary" className="flex-1" onClick={() => setShowNewTicketModal(false)}>
                  Отмена
                </UiButton>
                <UiButton type="submit" variant="primary" className="flex-1" disabled={submitting}>
                  {submitting ? 'Отправка...' : 'Отправить'}
                </UiButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
