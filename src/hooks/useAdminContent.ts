'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { supabase } from '@/lib/supabase/client'
import type { Locale } from '@/i18n/config'

// ============================================================
// 배너 (히어로 슬라이드) 훅
// ============================================================
interface Banner {
  id: string
  title: string
  image_url: string
  link_url: string | null
  is_active: boolean
  display_order: number
}

export function useBanners() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBanners = async () => {
      const { data, error } = await supabase
        .from('admin_banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) {
        console.error('[useBanners] Supabase error:', error)
      }

      setBanners(!error && data ? data : [])
      setLoading(false)
    }

    fetchBanners()
  }, [])

  return { banners, loading }
}

// ============================================================
// 상품 이미지 훅
// ============================================================
interface ProductImage {
  id: string
  product_slug: string
  image_url: string
  image_type: string
  display_order: number
  alt_text: string | null
}

export function useProductImages(productSlug: string) {
  const [images, setImages] = useState<ProductImage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productSlug) return

    const fetchImages = async () => {
      const { data, error } = await supabase
        .from('admin_product_images')
        .select('*')
        .eq('product_slug', productSlug)
        .order('display_order', { ascending: true })

      if (error) {
        console.error('[useProductImages] Supabase error:', error)
      }

      setImages(!error && data ? data : [])
      setLoading(false)
    }

    fetchImages()
  }, [productSlug])

  // gallery가 있으면 gallery를 우선 사용하고, 없으면 관리자에 등록된 대표/썸네일 이미지를 사용한다.
  const galleryImages = images.filter((img) => img.image_type === 'gallery')
  const imageUrls = (galleryImages.length > 0 ? galleryImages : images)
    .map((img) => img.image_url)

  return { images, imageUrls, loading }
}

export function useProductThumbnailMap() {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchThumbnails = async () => {
      const { data, error } = await supabase
        .from('admin_product_images')
        .select('product_slug, image_url, display_order')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        console.error('[useProductThumbnailMap] Supabase error:', error)
        setThumbnails({})
        setLoading(false)
        return
      }

      const nextThumbnails: Record<string, string> = {}
      for (const image of data || []) {
        if (!nextThumbnails[image.product_slug]) {
          nextThumbnails[image.product_slug] = image.image_url
        }
      }

      setThumbnails(nextThumbnails)
      setLoading(false)
    }

    fetchThumbnails()
  }, [])

  return { thumbnails, loading }
}

// ============================================================
// 상품 활성화 상태 훅
// ============================================================
export interface AdminProduct {
  slug: string
  name: string
  is_active: boolean
  // 프로그램 활성(사용 가능) 여부. is_active(메인 노출)와 분리된 마스터 스위치.
  // 컬럼이 없던 과거 데이터 호환을 위해 optional; undefined 는 활성(true)으로 간주한다.
  is_enabled?: boolean
  display_order: number
  badge_text?: string | null
  badge_color?: string | null
}

export interface ProductBadgeOverride {
  text: string | null
  color: string | null
}

// 기본 상품 목록 (DB 조회 실패 시 폴백)
const FALLBACK_PRODUCTS: AdminProduct[] = [
  { slug: 'idol-image', name: 'AI 이미지 분석 퍼퓸', is_active: true, is_enabled: true, display_order: 0 },
  { slug: 'figure', name: '피규어 화분 디퓨저', is_active: true, is_enabled: true, display_order: 1 },
  { slug: 'graduation', name: '졸업 기념 퍼퓸', is_active: false, is_enabled: false, display_order: 2 },
  { slug: 'le-quack', name: 'LE QUACK 시그니처', is_active: false, is_enabled: false, display_order: 3 },
  { slug: 'personal', name: '퍼스널 센트', is_active: false, is_enabled: false, display_order: 4 },
  { slug: 'chemistry', name: '레이어링 퍼퓸 세트', is_active: true, is_enabled: true, display_order: 5 },
  { slug: 'saju', name: '사주 분석 퍼퓸', is_active: false, is_enabled: false, display_order: 6 },
]

export function useActiveProducts() {
  const [products, setProducts] = useState<AdminProduct[]>(FALLBACK_PRODUCTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('admin_products')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) {
        console.error('[useActiveProducts] Supabase error:', error)
      }

      if (!error && data && data.length > 0) {
        setProducts(data)
      } else {
        setProducts(FALLBACK_PRODUCTS)
      }
      setLoading(false)
    }

    fetchProducts()
  }, [])

  // is_enabled: 프로그램 활성(사용 가능) 여부 — 상세/체크아웃/QR 진입 게이트.
  // is_active:  메인 노출 여부. 실제 메인 노출 = (활성 AND 메인 노출).
  const enabledSlugs = new Set(products.filter((p) => p.is_enabled !== false).map((p) => p.slug))
  const visibleSlugs = new Set(
    products.filter((p) => p.is_enabled !== false && p.is_active).map((p) => p.slug),
  )
  const knownSlugs = new Set(products.map((p) => p.slug))
  const activeProducts = products.filter((p) => p.is_enabled !== false)

  // 프로그램 활성(사용 가능) 여부. 행이 없으면 기본 활성(true).
  const isProductEnabled = (slug: string) => (knownSlugs.has(slug) ? enabledSlugs.has(slug) : true)
  // 메인/네비 노출 여부 = 활성 AND 메인 노출. 행이 없으면 기본 노출(true, 오늘의 향 등).
  const isProductVisible = (slug: string) => (knownSlugs.has(slug) ? visibleSlugs.has(slug) : true)
  // 하위호환 별칭: 기존 소비자(가드/체크아웃/마이페이지)는 "사용 가능 여부"를 의미했으므로 활성 여부로 매핑한다.
  const isProductActive = isProductEnabled

  // 관리자에서 지정한 뱃지 문구/색상. 미설정이면 null → 메인 페이지 기본 동작 유지
  const getProductBadge = (slug: string): ProductBadgeOverride => {
    const product = products.find((p) => p.slug === slug)
    return {
      text: product?.badge_text?.trim() || null,
      color: product?.badge_color?.trim() || null,
    }
  }

  return { products, activeProducts, isProductActive, isProductEnabled, isProductVisible, getProductBadge, loading }
}

export function useProductDisplayName(productSlug: string, fallbackName: string) {
  const locale = useLocale() as Locale
  const { products } = useActiveProducts()
  const adminName = products.find((product) => product.slug === productSlug)?.name

  return locale === 'ko' ? adminName || fallbackName : fallbackName
}
