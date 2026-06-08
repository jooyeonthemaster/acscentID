'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  PRODUCT_PRICING,
  type ProductType,
  type PricingOption,
} from '@/types/cart'
import { STORE_PRODUCTS, type StoreProduct } from '@/lib/products/store-products'

export interface PricingRow {
  product_type: ProductType
  size: string
  price: number
  original_price: number | null
  label: string
  sort_order: number
  is_active: boolean
  image_url: string | null
}

export type PricingMap = Record<ProductType, PricingRow[]>

/**
 * 클라이언트용 폴백 (DB 로딩 전 / 에러 시).
 * PRODUCT_PRICING 상수를 동일한 row 모양으로 변환.
 */
function applyStoreProductLabels(map: PricingMap, products: StoreProduct[]): PricingMap {
  const productBySize = new Map(
    products
      .filter((product) => product.isActive !== false)
      .map((product, index) => [
        product.size,
        {
          product,
          order: product.displayOrder ?? index,
        },
      ])
  )
  const out = {} as PricingMap

  for (const [productType, rows] of Object.entries(map)) {
    out[productType as ProductType] = rows
      .map((row) => {
        const match = productBySize.get(row.size)
        if (!match) return row
        return {
          ...row,
          label: match.product.title,
          image_url: row.image_url || match.product.image || null,
        }
      })
      .sort((a, b) => {
        const orderA = productBySize.get(a.size)?.order ?? Number.MAX_SAFE_INTEGER
        const orderB = productBySize.get(b.size)?.order ?? Number.MAX_SAFE_INTEGER
        if (orderA !== orderB) return orderA - orderB
        return a.sort_order - b.sort_order
      })
  }

  return out
}

async function fetchStoreProductsForLabels(): Promise<StoreProduct[]> {
  try {
    const res = await fetch('/api/store-products', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const products = (json.products ?? []) as StoreProduct[]
    return products.length > 0 ? products : STORE_PRODUCTS
  } catch (error) {
    console.error('[useProductPricing] store product label fetch failed:', error)
    return STORE_PRODUCTS
  }
}

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
      image_url: null,
    }))
  }
  return out
}

const FALLBACK_MAP = applyStoreProductLabels(buildFallbackMap(), STORE_PRODUCTS)

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
      // DB에 아직 신규 product_type 시드가 적용되지 않은 배포 환경에서는
      // 해당 타입만 코드 기본 가격표로 보완한다.
      for (const [productType, fallbackRows] of Object.entries(FALLBACK_MAP)) {
        if (!map[productType as ProductType]) {
          map[productType as ProductType] = fallbackRows
        }
      }
      const storeProducts = await fetchStoreProductsForLabels()
      const result = applyStoreProductLabels(map as PricingMap, storeProducts)
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

  // pricingMap 이 바뀔 때만 새로 생성 — 매 렌더 새 함수면 이걸 deps 로 쓰는 effect 가 무한 루프에 빠진다.
  const getOptions = useCallback((productType: ProductType): PricingRow[] => {
    const list = pricingMap[productType] ?? []
    return list.filter((r) => r.is_active)
  }, [pricingMap])

  const getOption = useCallback((productType: ProductType, size: string): PricingRow | null => {
    const list = pricingMap[productType] ?? []
    return list.find((r) => r.size === size) ?? null
  }, [pricingMap])

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
    if (productType === 'image_analysis_paper') return 'set'
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
