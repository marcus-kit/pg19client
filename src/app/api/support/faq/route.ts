import { getSupabaseServer } from '@/lib/supabase-server'

export interface FaqItem {
  id: number
  question: string
  answer: string
  category?: string
}

export async function GET() {
  try {
    const supabase = getSupabaseServer()
    const { data: page } = await supabase
      .from('pages')
      .select('content')
      .eq('slug', 'faq')
      .eq('is_published', true)
      .single()

    if (page?.content) {
      try {
        const parsed = JSON.parse(page.content as string)
        if (Array.isArray(parsed)) {
          return Response.json({ faq: parsed as FaqItem[] })
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // fallback to default
  }

  const defaultFaq: FaqItem[] = [
    {
      id: 1,
      question: 'Как пополнить баланс?',
      answer:
        'Вы можете пополнить баланс через личный кабинет банковской картой, через СБП или в любом отделении банка по реквизитам из счёта.',
      category: 'billing',
    },
    {
      id: 2,
      question: 'Что делать, если не работает интернет?',
      answer:
        'Проверьте подключение кабеля и перезагрузите роутер. Если проблема сохраняется, создайте обращение в техподдержку.',
      category: 'technical',
    },
    {
      id: 3,
      question: 'Как изменить тариф?',
      answer:
        'Перейдите в раздел "Услуги" и выберите новый тариф. Изменение вступит в силу со следующего расчётного периода.',
      category: 'tariff',
    },
    {
      id: 4,
      question: 'Где найти счета за услуги?',
      answer:
        'Все счета доступны в разделе "Счета" личного кабинета. Вы можете скачать счёт в PDF формате.',
      category: 'billing',
    },
    {
      id: 5,
      question: 'Как подключить дополнительные услуги?',
      answer:
        'В разделе "Услуги" представлен список доступных опций. Выберите нужную услугу и нажмите "Подключить".',
      category: 'services',
    },
  ]

  return Response.json({ faq: defaultFaq })
}
