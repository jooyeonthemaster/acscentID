/**
 * 상품 가격 — 서버사이드 단일 진실원천(SSOT).
 *
 * 데이터 흐름:
 *   admin_product_pricing (DB)  →  in-memory cache (60s TTL)  →  API/검증
 *
 * DB 장애 시 PRODUCT_PRICING 상수로 폴백 — 결제는 막히지 않되 신규 가격 정책은 미반영.
 * order_items.unit_price 는 주문 시점 스냅샷이므로 가격 변경이 기존 주문에 영향 없음.
 */

import { createServiceRoleClient } from '@/lib/supabase/service'
import {
  PRODUCT_PRICING,
  DEFAULT_SHIPPING_FEE,
  type ProductType,
  type PricingOption,
} from '@/types/cart'

export interface PricingRow {
  product_type: ProductType
  size: string
  price: number
  original_price: number | null
  label: string
  sort_order: number
  is_active: boolean
  updated_at: string
  updated_by: string | null
}

export type PricingMap = Record<ProductType, PricingRow[]>

const CACHE_TTL_MS = 60_000

let cache: { map: PricingMap; expiresAt: number } | null = null

/**
 * 캐시 무효화. 관리자에서 가격 변경 후 호출하면 즉시 반영.
 */
export function invalidatePricingCache(): void {
  cache = null
}

/**
 * 상수 → DB row 모양으로 변환 (폴백용)
 */
function buildFallbackMap(): PricingMap {
  const out = {} as PricingMap
  for (const [productType, options] of Object.entries(PRODUCT_PRICING)) {
    out[productType as ProductType] = options.map((opt: PricingOption, i: number) => ({
      product_type: productType as ProductType,
      size: opt.size,
      price: opt.price,
      original_price: null,
      label: opt.label,
      sort_order: i,
      is_active: true,
      updated_at: new Date(0).toISOString(),
      updated_by: 'fallback:constant',
    }))
  }
  return out
}

function rowsToMap(rows: PricingRow[]): PricingMap {
  const out: Partial<PricingMap> = {}
  for (const row of rows) {
    if (!out[row.product_type]) {
      out[row.product_type] = []
    }
    out[row.product_type]!.push(row)
  }
  // sort_order 순으로 정렬
  for (const key of Object.keys(out) as ProductType[]) {
    out[key]!.sort((a, b) => a.sort_order - b.sort_order)
  }
  return out as PricingMap
}

/**
 * 모든 가격 데이터를 캐시 인지 방식으로 조회.
 * 60초 TTL, DB 에러 시 PRODUCT_PRICING 상수로 폴백.
 */
export async function getServerPricing(): Promise<PricingMap> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) {
    return cache.map
  }

  try {
    const client = createServiceRoleClient()
    const { data, error } = await client
      .from('admin_product_pricing')
      .select('*')
      .order('product_type', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) throw error
    if (!data || data.length === 0) {
      console.warn('[pricing] empty admin_product_pricing → using constant fallback')
      const fallback = buildFallbackMap()
      cache = { map: fallback, expiresAt: now + CACHE_TTL_MS }
      return fallback
    }

    const map = rowsToMap(data as PricingRow[])
    cache = { map, expiresAt: now + CACHE_TTL_MS }
    return map
  } catch (err) {
    console.error('[pricing] DB query failed, falling back to constant:', err)
    const fallback = buildFallbackMap()
    // 폴백은 짧게 캐시 (10초) — 다음 요청에서 재시도
    cache = { map: fallback, expiresAt: now + 10_000 }
    return fallback
  }
}

/**
 * 특정 상품의 모든 사이즈 옵션 조회 (활성만).
 */
export async function getServerOptions(productType: ProductType): Promise<PricingRow[]> {
  const map = await getServerPricing()
  return (map[productType] ?? []).filter((row) => row.is_active)
}

/**
 * 특정 (상품, 사이즈) 조합의 가격 정보 조회.
 * 비활성 옵션도 포함 (관리자 조회용). 결제 차단은 validateServerPrice 에서 별도 처리.
 */
export async function getServerOption(
  productType: ProductType,
  size: string
): Promise<PricingRow | null> {
  const map = await getServerPricing()
  const list = map[productType] ?? []
  return list.find((row) => row.size === size) ?? null
}

export interface PriceValidationResult {
  valid: boolean
  expectedPrice: number
  reason?: 'unknown_product' | 'unknown_size' | 'inactive' | 'price_mismatch'
}

/**
 * 클라이언트가 보낸 가격을 DB 가격과 대조.
 * 비활성(is_active=false) 옵션은 결제 거부.
 */
export async function validateServerPrice(
  productType: ProductType,
  size: string,
  clientPrice: number
): Promise<PriceValidationResult> {
  const map = await getServerPricing()
  const list = map[productType]
  if (!list) {
    return { valid: false, expectedPrice: 0, reason: 'unknown_product' }
  }
  const opt = list.find((row) => row.size === size)
  if (!opt) {
    return { valid: false, expectedPrice: 0, reason: 'unknown_size' }
  }
  if (!opt.is_active) {
    return { valid: false, expectedPrice: opt.price, reason: 'inactive' }
  }
  if (clientPrice !== opt.price) {
    return { valid: false, expectedPrice: opt.price, reason: 'price_mismatch' }
  }
  return { valid: true, expectedPrice: opt.price }
}

/**
 * 배송비는 별도 정책 — 가격 테이블과 분리.
 * (요구사항: 배송비는 일단 건드리지 않음)
 */
export function getShippingFeeForProduct(productType: ProductType): number {
  if (productType === 'payment_test') return 0
  return DEFAULT_SHIPPING_FEE
}
