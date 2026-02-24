<script setup lang="ts">
/**
 * Страница счета на оплату — квитанция (как в two.html), сохранение в PDF
 */
import { useInvoiceServices } from '~/composables/useInvoiceServices'
import { formatKopeks } from '~/composables/useFormatters'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const invoiceId = route.params.id as string

const isSavingPdf = ref(false)
const invoicePdfRef = ref<HTMLElement | null>(null)

// Логотип и QR — из public
const logoSrc = '/logo.png'
const qrSrc = '/qr-payment.png'

// Получаем данные услуг для группировки по адресам
const { getInvoiceDetails } = useInvoiceServices()
const invoiceDetails = getInvoiceDetails(invoiceId)

// Группируем услуги по адресам для отображения без дублирования адресов
const groupedServices = computed(() => {
  return invoiceDetails.addresses.map(address => ({
    address: address.address,
    services: address.services,
    totalAmount: address.services.reduce((sum, s) => sum + s.price, 0)
  }))
})

function goBack() {
  router.push('/invoices')
}

function loadHtml2Pdf(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).html2pdf) {
      resolve((window as any).html2pdf)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
    script.async = true
    script.onload = () => resolve((window as any).html2pdf)
    script.onerror = () => reject(new Error('Не удалось загрузить библиотеку для PDF'))
    document.head.appendChild(script)
  })
}

async function saveAsPdf(): Promise<void> {
  const el = invoicePdfRef.value
  if (!el) return

  isSavingPdf.value = true
  const paperEl = el.querySelector('.invoice-paper') as HTMLElement | null
  const paperStyles: { border?: string; boxShadow?: string; borderRadius?: string } = {}
  const logoEl = el.querySelector('.receipt-logo')
  const logoStyles: { width?: string; height?: string; maxWidth?: string; maxHeight?: string; objectFit?: string; objectPosition?: string } = {}

  try {
    const html2pdf = await loadHtml2Pdf()
    const imgs = el.querySelectorAll('img')
    await Promise.all(Array.from(imgs).map(img => {
      if (img.complete) return Promise.resolve()
      return new Promise<void>(resolve => {
        img.onload = () => resolve()
        img.onerror = () => resolve()
        setTimeout(resolve, 3000)
      })
    }))

    // Правки в реальном DOM перед захватом — без замены img на div, чтобы в PDF было как на сайте
    if (paperEl) {
      paperStyles.border = paperEl.style.border
      paperStyles.boxShadow = paperEl.style.boxShadow
      paperStyles.borderRadius = paperEl.style.borderRadius
      paperEl.style.border = 'none'
      paperEl.style.boxShadow = 'none'
      paperEl.style.borderRadius = '0'
    }
    if (logoEl && logoEl instanceof HTMLImageElement) {
      logoStyles.width = logoEl.style.width
      logoStyles.height = logoEl.style.height
      logoStyles.maxWidth = logoEl.style.maxWidth
      logoStyles.maxHeight = logoEl.style.maxHeight
      logoStyles.objectFit = logoEl.style.objectFit
      logoStyles.objectPosition = logoEl.style.objectPosition
      logoEl.style.width = '110px'
      logoEl.style.height = '40px'
      logoEl.style.maxWidth = '110px'
      logoEl.style.maxHeight = '40px'
      logoEl.style.objectFit = 'contain'
      logoEl.style.objectPosition = 'left center'
    }

    const opt = {
      margin: [8, 6, 8, 6],
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        letterRendering: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
        backgroundColor: '#ffffff'
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] as unknown as never }
    }

    const pdfFilename = `Квитанция_${invoiceId}.pdf`

    // Получаем blob вместо .save() — на мобилках .save() вызывает навигацию по blob-UUID → 404
    const blob: Blob = await html2pdf().set(opt).from(el).outputPdf('blob')

    // На мобильных — пробуем Web Share API (шаринг файлом)
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try {
        const file = new File([blob], pdfFilename, { type: 'application/pdf' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: pdfFilename })
          return
        }
      } catch {
        // Пользователь отменил шаринг или API не поддерживает файлы — fallback ниже
      }
    }

    // Fallback: программное скачивание через <a download>
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = pdfFilename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    // Очистка
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 200)
  } catch (e) {
    console.error('Ошибка при сохранении PDF:', e)
    if (typeof window !== 'undefined') {
      window.alert('Не удалось сформировать PDF. Проверьте подключение к интернету и попробуйте снова.')
    }
  } finally {
    // Восстанавливаем DOM
    if (paperEl) {
      paperEl.style.border = paperStyles.border ?? ''
      paperEl.style.boxShadow = paperStyles.boxShadow ?? ''
      paperEl.style.borderRadius = paperStyles.borderRadius ?? ''
    }
    if (logoEl && logoEl instanceof HTMLImageElement) {
      logoEl.style.width = logoStyles.width ?? ''
      logoEl.style.height = logoStyles.height ?? ''
      logoEl.style.maxWidth = logoStyles.maxWidth ?? ''
      logoEl.style.maxHeight = logoStyles.maxHeight ?? ''
      logoEl.style.objectFit = logoStyles.objectFit ?? ''
      logoEl.style.objectPosition = logoStyles.objectPosition ?? ''
    }
    isSavingPdf.value = false
  }
}
</script>

<template>
  <div class="min-h-screen payment-page">
    <div class="container mx-auto max-w-4xl px-4 py-8">
      <button
        @click="goBack"
        class="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6"
      >
        <Icon name="heroicons:arrow-left" class="w-4 h-4" />
        Назад к счетам
      </button>

      <h1 class="text-2xl font-bold text-[var(--text-primary)] mb-6">Счет на оплату</h1>

      <!-- Квитанция (то же содержимое, что в two.html) — отображается и уходит в PDF -->
      <div ref="invoicePdfRef" class="receipt-wrapper">
        <article class="invoice-paper">
          <header class="doc-header">
            <div class="logo-container">
              <img :src="logoSrc" alt="ПЖ19" class="receipt-logo" />
            </div>
            <div class="header-right">
              <h2 class="invoice-title">КВИТАНЦИЯ НА ОПЛАТУ</h2>
              <div class="invoice-number">
                <strong>№ СЧ-2026-00003</strong> от <strong>19 декабря 2025 г.</strong>
              </div>
            </div>
          </header>

          <section class="info-section">
            <div class="info-block">
              <div class="info-title">Получатель</div>
              <div class="info-content">
                <p><strong>Артель "МИК"</strong></p>
                <p>Таганрог</p>
                <p>ИНН 6154168572 / КПП 615401001</p>
                <p>Р/с 40702810610002027590</p>
                <p>АО "ТБанк"</p>
                <p>БИК 044525974</p>
              </div>
            </div>
            <div class="info-block">
              <div class="info-title">Плательщик</div>
              <div class="info-content table-style">
                <span class="label">ФИО:</span>
                <span class="value"><strong>Иванов Иван Иванович</strong></span>
                <span class="label">Договор:</span>
                <span class="value">№101533</span>
                <span class="label">Дата формирования:</span>
                <span class="value"><strong>19 декабря 2025 г.</strong></span>
                <span class="label">Срок оплаты до:</span>
                <span class="value"><strong>29 декабря 2025 г.</strong></span>
              </div>
            </div>
          </section>

          <section class="table-container">
            <div class="table-title">Информация по договору и состав услуг</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 60%;">Услуга</th>
                  <th style="width: 40%; text-align: right;">Сумма</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(addressGroup, addressIndex) in groupedServices" :key="addressIndex">
                  <template v-for="(service, serviceIndex) in addressGroup.services" :key="serviceIndex">
                    <tr>
                      <td>
                        <span v-if="serviceIndex === 0" class="service-address">{{ addressGroup.address }}</span>
                        <span class="service-name">{{ service.name }}</span>
                      </td>
                      <td class="service-amount">{{ formatKopeks(service.price) }} ₽</td>
                    </tr>
                  </template>
                </template>
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td class="total-label">Итого:</td>
                  <td class="total-amount">3 095.00 ₽</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section class="payment-section">
            <div class="payment-title">Варианты оплаты</div>
            <div class="payment-online-hero" data-pdf-link-block="true">
              <div class="hero-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <div class="hero-content">
                <div class="hero-title">Оплата онлайн</div>
                <div class="hero-desc">Безопасный платеж через защищенный шлюз</div>
                <a href="https://artelmik.ru/external-payment.html?contract=101533" target="_blank" rel="noopener noreferrer" data-pdf-link="true" class="hero-link">
                  https://artelmik.ru/external-payment.html?contract=101533
                </a>
              </div>
            </div>
            <div class="payment-grid">
              <div class="payment-card">
                <div class="card-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18v-8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/><path d="M3 10h18V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/><line x1="12" y1="15" x2="12" y2="15"/></svg>
                  Банковский перевод
                </div>
                <div class="bank-details">
                  <p><strong>Получатель:</strong></p>
                  <div class="account-info">Артель "МИК"<br>ИНН 6154168572 / КПП 615401001</div>
                  <p><strong>Номер счета:</strong></p>
                  <div class="account-info">40702810610002027590</div>
                  <p><strong>Банк:</strong></p>
                  <div class="account-info">АО "ТБанк"<br>БИК: 044525974</div>
                  <p class="payment-purpose"><strong>Назначение платежа:</strong><br>Оплата по договору №101533, счет СЧ-2026-00003</p>
                </div>
              </div>
              <div class="payment-card">
                <div class="card-title qr-title">Быстрая оплата</div>
                <div class="qr-wrapper">
                  <img :src="qrSrc" alt="QR для оплаты" class="qr-image" />
                  <div class="qr-caption">Отсканируйте камерой<br>банковского приложения</div>
                </div>
              </div>
            </div>
          </section>
        </article>
      </div>

      <!-- Кнопки под квитанцией (не попадают в PDF) -->
      <div class="action-buttons-outside">
        <UiButton
          variant="secondary"
          @click="saveAsPdf"
          :disabled="isSavingPdf"
          class="btn-pdf"
        >
          <Icon v-if="isSavingPdf" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
          <Icon v-else name="heroicons:arrow-down-tray" class="w-4 h-4" />
          {{ isSavingPdf ? 'Формируем PDF…' : 'Сохранить PDF' }}
        </UiButton>
        <UiButton variant="primary" @click="goBack">
          Закрыть
        </UiButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.payment-page {
  background: var(--bg-base);
}

.receipt-wrapper {
  margin-bottom: 24px;
}

.action-buttons-outside {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.btn-pdf {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>

<style>
/* Стили квитанции (как в two.html) — без scoped, чтобы PDF совпадал с экраном */
.receipt-wrapper {
  --text-dark: #2c2c2c;
  --text-gray: #666666;
  --text-light: #999999;
  --bg-paper: #ffffff;
  --border-color: #e0e0e0;
  --border-light: #f0f0f0;
  --primary-blue: #2563eb;
}

.invoice-paper {
  background-color: var(--bg-paper);
  width: 100%;
  max-width: 900px;
  padding: 60px 50px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  border: 1px solid var(--border-light);
}

.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 35px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
}

.logo-container { display: flex; align-items: center; gap: 15px; }

.receipt-logo {
  width: auto;
  height: 85px;
  max-width: 140px;
  object-fit: contain;
  display: block;
}

.header-right { text-align: right; flex: 1; }

.invoice-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-dark);
  letter-spacing: 0.5px;
  margin-bottom: 3px;
  line-height: 1.1;
}

.invoice-number { font-size: 14px; color: var(--text-gray); line-height: 1.2; }
.invoice-number strong { color: var(--text-dark); font-weight: 600; }

.info-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  margin-bottom: 30px;
}

.info-block { display: flex; flex-direction: column; }

.info-title {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--text-gray);
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-bottom: 15px;
  background-color: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.info-content { font-size: 14px; color: var(--text-dark); line-height: 1.8; }
.info-content p { margin-bottom: 6px; }

.info-content.table-style {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px 20px;
  line-height: 1.6;
}
.info-content.table-style .label { color: var(--text-gray); font-weight: 500; }
.info-content.table-style .value { color: var(--text-dark); }
.info-content strong { font-weight: 600; }

.table-container { margin-bottom: 40px; }
.table-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-dark);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.receipt-wrapper table { width: 100%; border-collapse: collapse; font-size: 12px; }
.receipt-wrapper th {
  text-align: left;
  padding: 8px 10px;
  background-color: #fafafa;
  border-bottom: 2px solid var(--border-color);
  color: var(--text-gray);
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.receipt-wrapper td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-dark);
  vertical-align: top;
}
.receipt-wrapper tbody tr:last-child td { border-bottom: none; }

.service-address {
  font-weight: 700;
  color: var(--text-dark);
  display: block;
  margin-bottom: 2px;
  font-size: 11px;
}
.service-name { color: var(--text-gray); font-size: 11px; line-height: 1.4; }
.service-amount { text-align: right; font-weight: 600; color: var(--text-dark); font-size: 12px; }

.total-row { background-color: #fafafa; font-weight: 700; font-size: 13px; }
.total-row td { padding: 10px; border-top: 2px solid var(--border-color); border-bottom: 2px solid var(--border-color); }
.total-label { text-transform: uppercase; letter-spacing: 0.5px; }
.total-amount { text-align: right; font-size: 14px; }

.payment-section { margin-top: 20px; }
.payment-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-dark);
  margin-bottom: 25px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.payment-online-hero {
  background-color: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 6px;
  padding: 25px;
  margin-bottom: 25px;
  display: flex;
  align-items: center;
  gap: 20px;
}
.hero-icon {
  width: 48px;
  height: 48px;
  background-color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--primary-blue);
  border: 1px solid #bfdbfe;
}
.hero-content { flex-grow: 1; }
.hero-title { font-size: 16px; font-weight: 700; color: #1e3a8a; margin-bottom: 4px; }
.hero-desc { margin-bottom: 5px; font-size: 13px; color: var(--text-gray); }
.hero-link {
  color: var(--primary-blue);
  text-decoration: none;
  font-weight: 600;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  word-break: break-all;
}
.hero-link:hover { text-decoration: underline; }

.payment-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 25px;
}
.payment-card {
  background: #fafafa;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 18px;
  height: 100%;
}
.card-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dark);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-title.qr-title { justify-content: center; }
.bank-details { font-size: 12px; color: var(--text-dark); line-height: 1.5; }
.bank-details p { margin-bottom: 5px; }
.bank-details strong { font-weight: 600; }
.account-info {
  font-family: 'Courier New', monospace;
  background-color: #ffffff;
  padding: 6px 10px;
  border: 1px solid var(--border-light);
  margin: 5px 0;
  font-size: 11px;
}
.payment-purpose { margin-top: 8px; font-size: 11px; color: var(--text-gray); }

.qr-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
}
.qr-image {
  width: 140px;
  height: 140px;
  background: white;
  padding: 10px;
  border: 1px solid var(--border-color);
  margin-bottom: 10px;
  border-radius: 4px;
  object-fit: contain;
}
.qr-caption { font-size: 12px; color: var(--text-gray); line-height: 1.4; }

@media (max-width: 768px) {
  .invoice-paper { padding: 30px 20px; }
  .doc-header { flex-direction: column; gap: 20px; }
  .header-right { text-align: left; }
  .info-section { grid-template-columns: 1fr; gap: 30px; }
  .payment-online-hero { flex-direction: column; text-align: center; }
  .payment-grid { grid-template-columns: 1fr; }
}
</style>
