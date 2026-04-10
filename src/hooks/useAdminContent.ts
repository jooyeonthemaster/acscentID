'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

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

      if (!error && data && data.length > 0) {
        setBanners(data)
      } else {
        // fallback: 기존 하드코딩 배너 (DB 비어있거나 에러 시)
        setBanners([
          {
            id: 'fallback-1',
            title: 'AI 이미지 분석 퍼퓸',
            image_url: '/images/hero/1.jpg',
            link_url: '/programs/idol-image',
            is_active: true,
            display_order: 0,
          },
          {
            id: 'fallback-2',
            title: '피규어 화분 디퓨저',
            image_url: '/images/hero/2.jpg',
            link_url: '/programs/figure',
            is_active: true,
            display_order: 1,
          },
        ])
      }
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

// 기본 하드코딩 이미지 (DB에 데이터가 없을 때 폴백)
const FALLBACK_IMAGES: Record<string, string[]> = {
  'idol-image': [
    '/images/perfume/KakaoTalk_20260125_225218071.jpg',
    '/images/perfume/KakaoTalk_20260125_225218071_01.jpg',
  ],
  figure: [
    '/images/diffuser/KakaoTalk_20260125_225229624.jpg',
    '/images/diffuser/KakaoTalk_20260125_225229624_01.jpg',
  ],
  graduation: [
    '/images/jollduck/KakaoTalk_20260130_201156204.jpg',
    '/images/jollduck/KakaoTalk_20260130_201156204_01.jpg',
    '/images/jollduck/KakaoTalk_20260130_201156204_02.jpg',
  ],
  'le-quack': ['/images/perfume/LE QUACK.avif'],
  personal: [
    '/제목 없는 디자인 (4)/1.png',
    '/제목 없는 디자인 (4)/2.png',
    '/제목 없는 디자인 (4)/3.png',
  ],
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

      if (!error && data && data.length > 0) {
        setImages(data)
      } else {
        // fallback (DB 비어있거나 에러 시)
        const fallback = FALLBACK_IMAGES[productSlug] || []
        setImages(
          fallback.map((url, i) => ({
            id: `fallback-${i}`,
            product_slug: productSlug,
            image_url: url,
            image_type: 'gallery',
            display_order: i,
            alt_text: null,
          }))
        )
      }
      setLoading(false)
    }

    fetchImages()
  }, [productSlug])

  // gallery 이미지 URL 배열 (편의 함수)
  const imageUrls = images
    .filter((img) => img.image_type === 'gallery')
    .map((img) => img.image_url)

  return { images, imageUrls, loading }
}

// ============================================================
// 상품 활성화 상태 훅
// ============================================================
export interface AdminProduct {
  slug: string
  name: string
  is_active: boolean
  display_order: number
}

// 기본 상품 목록 (DB 조회 실패 시 폴백)
const FALLBACK_PRODUCTS: AdminProduct[] = [
  { slug: 'idol-image', name: 'AI 이미지 분석 퍼퓸', is_active: true, display_order: 0 },
  { slug: 'figure', name: '피규어 화분 디퓨저', is_active: true, display_order: 1 },
  { slug: 'graduation', name: '졸업 기념 퍼퓸', is_active: false, display_order: 2 },
  { slug: 'le-quack', name: 'LE QUACK 시그니처', is_active: false, display_order: 3 },
  { slug: 'personal', name: '퍼스널 센트', is_active: false, display_order: 4 },
  { slug: 'chemistry', name: '케미 향수 세트', is_active: true, display_order: 5 },
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

  const activeProducts = products.filter((p) => p.is_active)
  const activeSlugs = new Set(activeProducts.map((p) => p.slug))

  const isProductActive = (slug: string) => activeSlugs.has(slug)

  return { products, activeProducts, isProductActive, loading }
}
