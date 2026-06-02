export type ProductPageTextField = 'badge' | 'imagePlaceholder' | 'subtitle' | 'infoTitle' | 'infoBody' | 'ctaLabel'
export type ProductPagePositionField = ProductPageTextField | 'productImage' | 'productName' | 'infoCard' | 'ctaButton'

export interface ProductPagePosition {
  x: number
  y: number
}

export interface ProductPageContent {
  badge: string
  imagePlaceholder: string
  subtitle: string
  infoTitle: string
  infoBody: string
  ctaLabel: string
  positions: Partial<Record<ProductPagePositionField, ProductPagePosition>>
}

const DEFAULT_PAGE_CONTENT: ProductPageContent = {
  badge: 'NEW',
  imagePlaceholder: '상품 이미지를 추가하세요',
  subtitle: '상품 설명은 상세페이지 템플릿에서 직접 수정해주세요.',
  infoTitle: '상품 정보',
  infoBody: '가격, 구성, 배송 안내는 관리자 화면에서 상품 성격에 맞게 채워주세요.',
  ctaLabel: '버튼 문구를 설정해주세요',
  positions: {},
}

const TEXT_FIELDS: ProductPageTextField[] = ['badge', 'imagePlaceholder', 'subtitle', 'infoTitle', 'infoBody', 'ctaLabel']
const POSITION_FIELDS: ProductPagePositionField[] = [
  'badge',
  'imagePlaceholder',
  'subtitle',
  'infoTitle',
  'infoBody',
  'ctaLabel',
  'productImage',
  'productName',
  'infoCard',
  'ctaButton',
]

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function decodeHtmlAttribute(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

export function getDefaultProductPageContent(): ProductPageContent {
  return { ...DEFAULT_PAGE_CONTENT, positions: {} }
}

export function normalizeProductPageContent(value: Partial<ProductPageContent> | null | undefined): ProductPageContent {
  const source = value || {}
  const normalized = getDefaultProductPageContent()

  TEXT_FIELDS.forEach((field) => {
    if (typeof source[field] === 'string') {
      normalized[field] = source[field] as string
    }
  })

  if (source.positions && typeof source.positions === 'object') {
    POSITION_FIELDS.forEach((field) => {
      const point = source.positions?.[field]
      if (!point) return
      const x = Number(point.x)
      const y = Number(point.y)
      if (!Number.isFinite(x) || !Number.isFinite(y)) return
      normalized.positions[field] = {
        x: Math.max(-2000, Math.min(2000, Math.round(x))),
        y: Math.max(-2000, Math.min(2000, Math.round(y))),
      }
    })
  }

  return normalized
}

export function serializeProductPageContentConfig(content: Partial<ProductPageContent>) {
  const normalized = normalizeProductPageContent(content)
  return `<div data-ac-page-config="1" data-config="${escapeHtml(JSON.stringify(normalized))}" style="display:none"></div>`
}

export function extractProductPageContent(html: string | null | undefined): ProductPageContent {
  if (!html) return getDefaultProductPageContent()

  const parseConfig = (raw: string | null | undefined) => {
    if (!raw) return null
    try {
      return normalizeProductPageContent(JSON.parse(decodeHtmlAttribute(raw)) as Partial<ProductPageContent>)
    } catch {
      return null
    }
  }

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const marker = doc.querySelector<HTMLElement>('[data-ac-page-config="1"]')
    const parsed = parseConfig(marker?.getAttribute('data-config'))
    if (parsed) return parsed
  }

  const match = html.match(/<[^>]+data-ac-page-config=["']1["'][^>]*data-config=["']([^"']*)["'][^>]*>/)
  return parseConfig(match?.[1]) || getDefaultProductPageContent()
}

export function extractProductPageContentWithFallback(
  html: string | null | undefined,
  fallback: Partial<ProductPageContent>,
): ProductPageContent {
  const extracted = extractProductPageContent(html)
  const defaults = getDefaultProductPageContent()
  const normalizedFallback = normalizeProductPageContent(fallback)
  const merged: ProductPageContent = {
    ...extracted,
    positions: { ...extracted.positions },
  }

  TEXT_FIELDS.forEach((field) => {
    if (extracted[field] === defaults[field]) {
      merged[field] = normalizedFallback[field]
    }
  })

  return merged
}

export function stripProductPageContentConfig(html: string) {
  return html.replace(/<[^>]+data-ac-page-config=["']1["'][^>]*><\/[^>]+>/g, '').trim()
}

export function mergeProductPageContentConfig(html: string, content: Partial<ProductPageContent>) {
  const stripped = stripProductPageContentConfig(html)
  const marker = serializeProductPageContentConfig(content)
  return `${marker}${stripped ? `\n${stripped}` : ''}`
}
