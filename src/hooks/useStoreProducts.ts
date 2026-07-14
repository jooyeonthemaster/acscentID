'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { STORE_PRODUCTS, type StoreProduct } from '@/lib/products/store-products'

let cachedProducts: StoreProduct[] | null = null
let inFlight: Promise<StoreProduct[]> | null = null

async function fetchStoreProducts(force = false, includeInactive = false): Promise<StoreProduct[]> {
  // 관리자 미리보기(비활성 포함)는 공용 캐시를 오염시키지 않도록 항상 최신을 가져온다
  if (!includeInactive && !force && cachedProducts) return cachedProducts
  if (!includeInactive && !force && inFlight) return inFlight

  const endpoint = includeInactive ? '/api/store-products?includeInactive=1' : '/api/store-products'
  const request = fetch(endpoint, { cache: 'no-store' })
    .then((res) => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
    .then((json) => {
      const products = Array.isArray(json.products) && json.products.length > 0
        ? json.products as StoreProduct[]
        : STORE_PRODUCTS
      if (!includeInactive) cachedProducts = products
      return products
    })
    .catch((error) => {
      console.error('[useStoreProducts] fetch failed, fallback to constants:', error)
      return STORE_PRODUCTS
    })
    .finally(() => {
      if (!includeInactive) inFlight = null
    })

  if (includeInactive || force) return request

  inFlight = request
  return inFlight
}

export function invalidateStoreProductsCache(): void {
  cachedProducts = null
}

export function useStoreProducts(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false
  const [products, setProducts] = useState<StoreProduct[]>(cachedProducts ?? STORE_PRODUCTS)
  const [loading, setLoading] = useState(!cachedProducts)

  const refresh = useCallback(async () => {
    setLoading(true)
    const nextProducts = await fetchStoreProducts(true, includeInactive)
    setProducts(nextProducts)
    setLoading(false)
    return nextProducts
  }, [includeInactive])

  useEffect(() => {
    let cancelled = false
    fetchStoreProducts(true, includeInactive).then((nextProducts) => {
      if (cancelled) return
      setProducts(nextProducts)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [includeInactive])

  const helpers = useMemo(() => ({
    getProductBySlug: (slug: string | null | undefined) => {
      if (!slug) return undefined
      return products.find((product) => product.slug === slug)
    },
    getProductBySize: (size: string | null | undefined) => {
      if (!size) return undefined
      return products.find((product) => product.size === size)
    },
  }), [products])

  return {
    products,
    loading,
    refresh,
    ...helpers,
  }
}
