import { SCENT_PAPER_SIZE, type ProductType } from '@/types/cart'
import type { TodayScent } from '@/lib/today-scent/scents'
import { PRODUCT_IMAGE_PLACEHOLDER } from './images'

export const STORE_PRODUCT_TYPE: ProductType = 'store_product'
export const STORE_PRODUCT_DB_COMPAT_TYPE: ProductType = 'today_scent'
export const STORE_PRODUCT_IMAGE = PRODUCT_IMAGE_PLACEHOLDER

export interface StoreProduct {
  slug: string
  title: string
  shortLabel: string
  size: string
  fallbackPrice: number
  image: string
  badge: string
  description: string
  included: string[]
  isActive?: boolean
  displayOrder?: number
}

export const STORE_PRODUCTS: StoreProduct[] = [
  {
    slug: 'perfume-50ml',
    title: '50ml 향수',
    shortLabel: '50ml',
    size: '50ml',
    fallbackPrice: 48000,
    image: STORE_PRODUCT_IMAGE,
    badge: 'FULL SIZE',
    description: '마음에 드는 AC\'SCENT 향을 넉넉하게 사용하는 정규 용량 향수입니다.',
    included: ['선택 향 50ml 스프레이 향수', '프리미엄 패키지', '주문 후 2~3일 내 배송'],
  },
  {
    slug: 'perfume-10ml',
    title: '10ml 향수',
    shortLabel: '10ml',
    size: '10ml',
    fallbackPrice: 24000,
    image: STORE_PRODUCT_IMAGE,
    badge: 'MINI',
    description: '가볍게 휴대하며 쓰기 좋은 미니 사이즈 향수입니다.',
    included: ['선택 향 10ml 스프레이 향수', '휴대용 패키지', '주문 후 2~3일 내 배송'],
  },
  {
    slug: 'scent-paper',
    title: '시향지',
    shortLabel: '시향지',
    size: SCENT_PAPER_SIZE,
    fallbackPrice: 4000,
    image: STORE_PRODUCT_IMAGE,
    badge: 'SAMPLE',
    description: '향수를 구매하기 전 원하는 향을 먼저 확인할 수 있는 시향 상품입니다.',
    included: ['선택 향 시향지', '향 노트 카드', '주문 후 2~3일 내 배송'],
  },
]

export function getStoreProductBySlug(slug: string | null | undefined): StoreProduct | undefined {
  if (!slug) return undefined
  return STORE_PRODUCTS.find((product) => product.slug === slug)
}

export function getStoreProductBySize(size: string | null | undefined): StoreProduct | undefined {
  if (!size) return undefined
  return STORE_PRODUCTS.find((product) => product.size === size)
}

export interface StoreProductRow {
  slug: string
  title: string
  short_label: string | null
  size: string
  fallback_price: number | null
  image_url: string | null
  badge: string | null
  description: string | null
  included: unknown
  is_active?: boolean | null
  display_order?: number | null
}

export interface StoreProductImageRow {
  product_slug: string
  image_url: string | null
  display_order?: number | null
}

export function normalizeIncluded(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => typeof item === 'string' ? item.trim() : '')
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export function applyRepresentativeProductImages(
  products: StoreProduct[],
  images: StoreProductImageRow[],
): StoreProduct[] {
  if (products.length === 0 || images.length === 0) return products

  const primaryImageBySlug = new Map<string, string>()
  const sortedImages = [...images].sort((a, b) => {
    const orderA = a.display_order ?? 0
    const orderB = b.display_order ?? 0
    if (orderA !== orderB) return orderA - orderB
    return a.product_slug.localeCompare(b.product_slug)
  })

  for (const image of sortedImages) {
    if (!image.image_url || primaryImageBySlug.has(image.product_slug)) continue
    primaryImageBySlug.set(image.product_slug, image.image_url)
  }

  return products.map((product) => ({
    ...product,
    image: primaryImageBySlug.get(product.slug) || product.image,
  }))
}

export function mapStoreProductRow(row: StoreProductRow): StoreProduct {
  return {
    slug: row.slug,
    title: row.title,
    shortLabel: row.short_label || row.title,
    size: row.size,
    fallbackPrice: row.fallback_price ?? 0,
    image: row.image_url || STORE_PRODUCT_IMAGE,
    badge: row.badge || '상품',
    description: row.description || '',
    included: normalizeIncluded(row.included),
    isActive: row.is_active ?? true,
    displayOrder: row.display_order ?? 0,
  }
}

export function getStoreProductName(product: StoreProduct, scent: TodayScent): string {
  return `${scent.name} · ${product.title}`
}

export function buildStoreCheckoutUrl(product: StoreProduct, scent: TodayScent): string {
  return `/checkout?product=store&type=${STORE_PRODUCT_TYPE}&item=${product.slug}&scent=${scent.id}&size=${product.size}`
}

export function buildStoreAnalysisData(product: StoreProduct, scent: TodayScent, requestNote?: string) {
  const note = requestNote?.trim()
  return {
    matchingPerfumes: [{
      perfumeId: scent.id,
      persona: {
        name: getStoreProductName(product, scent),
        recommendation: scent.vibe,
      },
    }],
    matchingKeywords: [product.shortLabel, ...scent.keywords],
    storeProduct: {
      slug: product.slug,
      title: product.title,
      size: product.size,
      scentId: scent.id,
      scentName: scent.name,
      perfumeId: scent.perfumeId,
      notes: scent.notes,
      // 사용자가 향 선택 단계에서 남긴 선택사항 "특정 향료 요청" 메모 (있을 때만 저장)
      ...(note ? { requestNote: note } : {}),
    },
  }
}

export function isStoreProductAnalysisData(analysisData: unknown): boolean {
  return Boolean(
    analysisData &&
    typeof analysisData === 'object' &&
    'storeProduct' in analysisData
  )
}

export function getEffectiveProductType(
  productType: ProductType | string | null | undefined,
  analysisData?: unknown
): ProductType {
  if (productType === STORE_PRODUCT_TYPE || isStoreProductAnalysisData(analysisData)) {
    return STORE_PRODUCT_TYPE
  }
  return (productType || 'image_analysis') as ProductType
}

export function withStoreProductCompatAnalysisData(analysisData: unknown): object {
  const base = analysisData && typeof analysisData === 'object' && !Array.isArray(analysisData)
    ? analysisData as Record<string, unknown>
    : {}

  return {
    ...base,
    actualProductType: STORE_PRODUCT_TYPE,
    dbCompatibilityProductType: STORE_PRODUCT_DB_COMPAT_TYPE,
  }
}

export function isStoreProductConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String(error.code) : ''
  const message = 'message' in error ? String(error.message) : ''

  return code === '23514' && (
    message.includes('product_ref_check') ||
    message.includes('product_type_check')
  )
}
