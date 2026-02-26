export interface FaqItem {
  id: number
  question: string
  answer: string
  category?: string
}

export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  const page = await prisma.page.findFirst({
    where: { slug: 'faq', is_published: true },
    select: { content: true }
  })

  if (page?.content) {
    try {
      const parsed = JSON.parse(page.content)
      if (Array.isArray(parsed)) return { faq: parsed as FaqItem[] }
    } catch {
      /* ignore */
    }
  }

  const defaultFaq: FaqItem[] = [
    { id: 1, question: 'Как пополнить баланс?', answer: 'Вы можете пополнить баланс через личный кабинет банковской картой, через СБП или в любом отделении банка по реквизитам из счёта.', category: 'billing' },
    { id: 2, question: 'Что делать, если не работает интернет?', answer: 'Проверьте подключение кабеля и перезагрузите роутер. Если проблема сохраняется, создайте обращение в техподдержку.', category: 'technical' },
    { id: 3, question: 'Как изменить тариф?', answer: 'Перейдите в раздел "Услуги" и выберите новый тариф. Изменение вступит в силу со следующего расчётного периода.', category: 'tariff' },
    { id: 4, question: 'Где найти счета за услуги?', answer: 'Все счета доступны в разделе "Счета" личного кабинета. Вы можете скачать счёт в PDF формате.', category: 'billing' },
    { id: 5, question: 'Как подключить дополнительные услуги?', answer: 'В разделе "Услуги" представлен список доступных опций. Выберите нужную услугу и нажмите "Подключить".', category: 'services' }
  ]
  return { faq: defaultFaq }
})
