'use client'

import { useEffect, useState } from 'react'
import { UiCard } from '@/components/ui/ui-card'
import { DashboardBalanceCard } from '@/components/dashboard/dashboard-balance-card'
import type { News, NewsCategory } from '@/types'

const categoryLabels: Record<NewsCategory, string> = {
  announcement: 'Объявление',
  protocol: 'Протокол',
  notification: 'Уведомление',
}

const categoryVariants: Record<NewsCategory, string> = {
  announcement: 'warning',
  protocol: 'info',
  notification: 'success',
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function DashboardView() {
  const [news, setNews] = useState<News[]>([])
  const [pending, setPending] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNewsId, setSelectedNewsId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setPending(true)
    setError(null)
    fetch('/api/news?active=true')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.news) {
          setNews(data.news.slice(0, 3))
        }
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить новости')
      })
      .finally(() => {
        if (!cancelled) setPending(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <DashboardBalanceCard />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Новости сообщества
          </h2>
        </div>

        {pending && (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <UiCard key={i} className="animate-pulse p-5">
                <div className="mb-2 h-3 w-20 rounded bg-white/10" />
                <div className="mb-2 h-5 w-full rounded bg-white/10" />
                <div className="h-4 w-full rounded bg-white/10" />
              </UiCard>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-center text-red-400">{error}</p>
          </div>
        )}

        {!pending && !error && news.length === 0 && (
          <div className="rounded-lg bg-white/5 p-8 text-center">
            <p className="text-[var(--text-muted)]">Новостей пока нет</p>
          </div>
        )}

        {!pending && !error && news.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            {news.map((item) => (
              <UiCard
                key={item.id}
                hover
                className="cursor-pointer transition-transform hover:scale-[1.02]"
                onClick={() => setSelectedNewsId(item.id)}
              >
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatDateShort(item.publishedAt)}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      categoryVariants[item.category] === 'warning'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : categoryVariants[item.category] === 'info'
                          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          : 'bg-green-500/20 text-green-600 dark:text-green-400'
                    }`}
                  >
                    {categoryLabels[item.category]}
                  </span>
                </div>
                <h3 className="mb-2 font-medium text-[var(--text-primary)]">
                  {item.title}
                </h3>
                <p className="line-clamp-2 text-sm text-[var(--text-secondary)]">
                  {item.summary || item.content.substring(0, 100) + '...'}
                </p>
              </UiCard>
            ))}
          </div>
        )}

        {selectedNewsId && (
          <NewsModal
            newsId={selectedNewsId}
            onClose={() => setSelectedNewsId(null)}
          />
        )}
      </section>
    </div>
  )
}

function NewsModal({
  newsId,
  onClose,
}: { newsId: number; onClose: () => void }) {
  const [news, setNews] = useState<{ title: string; content: string } | null>(
    null
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/news/${newsId}`)
      .then((res) => res.json())
      .then((data) => setNews(data.news))
      .finally(() => setLoading(false))
  }, [newsId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--glass-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--glass-bg)]"
        >
          <span className="text-xl leading-none">&times;</span>
        </button>
        {loading && <p className="text-[var(--text-muted)]">Загрузка...</p>}
        {news && (
          <>
            <h2 className="pr-8 text-xl font-semibold text-[var(--text-primary)]">
              {news.title}
            </h2>
            <div
              className="mt-4 text-[var(--text-secondary)] whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: news.content }}
            />
          </>
        )}
      </div>
    </div>
  )
}
