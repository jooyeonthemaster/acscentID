'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { STORE_PRODUCTS, type StoreProduct } from '@/lib/products/store-products'

let cachedProducts: StoreProduct[] | null = null
let inFlight: Promise<StoreProduct[]> | null = null

async function fetchStoreProducts(force = false): Promise<StoreProduct[]> {
  if (!force && cachedProducts) return cachedProducts
  if (!force && inFlight) return inFlight

  const request = fetch('/api/store-products', { cache: 'no-store' })
    .then((res) => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
    .then((json) => {
      const products = Array.isArray(json.products) && json.products.length > 0
        ? json.products as StoreProduct[]
        : STORE_PRODUCTS
      cachedProducts = products
      return products
    })
    .catch((error) => {
      console.error('[useStoreProducts] fetch failed, fallback to constants:', error)
      return STORE_PRODUCTS
    })
    .finally(() => {
      inFlight = null
    })

  if (force) return request

  inFlight = request
  return inFlight
}

export function invalidateStoreProductsCache(): void {
  cachedProducts = null
}

export function useStoreProducts() {
  const [products, setProducts] = useState<StoreProduct[]>(cachedProducts ?? STORE_PRODUCTS)
  const [loading, setLoading] = useState(!cachedProducts)

  const refresh = useCallback(async () => {
    setLoading(true)
    const nextProducts = await fetchStoreProducts(true)
    setProducts(nextProducts)
    setLoading(false)
    return nextProducts
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchStoreProducts(true).then((nextProducts) => {
      if (cancelled) return
      setProducts(nextProducts)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

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
