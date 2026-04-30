'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  PRODUCT_PRICING,
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
}

export type PricingMap = Record<ProductType, PricingRow[]>

/**
 * 클라이언트용 폴백 (DB 로딩 전 / 에러 시).
 * PRODUCT_PRICING 상수를 동일한 row 모양으로 변환.
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
    }))
  }
  return out
}

const FALLBACK_MAP = buildFallbackMap()

// 모듈 레벨 메모이제이션 — 페이지 간 이동 시 재요청 방지
let cachedMap: PricingMap | null = null
let inFlight: Promise<PricingMap> | null = null

async function fetchPricingMap(): Promise<PricingMap> {
  if (cachedMap) return cachedMap
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const { data, error } = await supabase
        .from('admin_product_pricing')
        .select('*')
        .order('product_type', { ascending: true })
        .order('sort_order', { ascending: true })

      if (error) throw error
      if (!data || data.length === 0) return FALLBACK_MAP

      const map: Partial<PricingMap> = {}
      for (const row of data as PricingRow[]) {
        if (!map[row.product_type]) map[row.product_type] = []
        map[row.product_type]!.push(row)
      }
      const result = map as PricingMap
      cachedMap = result
      return result
    } catch (e) {
      console.error('[useProductPricing] fetch failed, fallback to constants:', e)
      return FALLBACK_MAP
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

/**
 * 외부에서 캐시 무효화 — 관리자가 가격 수정 후 호출.
 */
export function invalidateClientPricingCache(): void {
  cachedMap = null
}

export interface UseProductPricingResult {
  pricingMap: PricingMap
  loading: boolean
  /** 특정 상품의 활성 옵션 (sort_order 정렬됨) */
  getOptions: (productType: ProductType) => PricingRow[]
  /** (상품, 사이즈) 가격 조회 — 활성 여부 무관 */
  getOption: (productType: ProductType, size: string) => PricingRow | null
  /** (상품, 사이즈) 가격(숫자만). 매칭 실패 시 폴백 상수의 첫 옵션 가격. */
  getPrice: (productType: ProductType, size: string) => number
  /** (상품) 기본 가격 — 첫 활성 옵션 */
  getDefaultPrice: (productType: ProductType) => number
  /** (상품) 기본 사이즈 */
  getDefaultSize: (productType: ProductType) => string
}

export function useProductPricing(): UseProductPricingResult {
  const [pricingMap, setPricingMap] = useState<PricingMap>(cachedMap ?? FALLBACK_MAP)
  const [loading, setLoading] = useState<boolean>(!cachedMap)

  useEffect(() => {
    let cancelled = false
    fetchPricingMap().then((map) => {
      if (cancelled) return
      setPricingMap(map)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const getOptions = (productType: ProductType): PricingRow[] => {
    const list = pricingMap[productType] ?? []
    return list.filter((r) => r.is_active)
  }

  const getOption = (productType: ProductType, size: string): PricingRow | null => {
    const list = pricingMap[productType] ?? []
    return list.find((r) => r.size === size) ?? null
  }

  const getPrice = (productType: ProductType, size: string): number => {
    const opt = getOption(productType, size)
    if (opt) return opt.price
    const list = pricingMap[productType] ?? []
    return list[0]?.price ?? 0
  }

  const getDefaultSize = (productType: ProductType): string => {
    const list = getOptions(productType)
    if (list.length > 0) return list[0].size
    if (productType === 'figure_diffuser') return 'set'
    if (productType === 'chemistry_set') return 'set_10ml'
    return '10ml'
  }

  const getDefaultPrice = (productType: ProductType): number => {
    return getPrice(productType, getDefaultSize(productType))
  }

  return {
    pricingMap,
    loading,
    getOptions,
    getOption,
    getPrice,
    getDefaultPrice,
    getDefaultSize,
  }
}
