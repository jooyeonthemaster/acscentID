'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

// 고객 화면은 "배포된" 상태만 읽습니다.
// 관리자 에디터의 draft(custom_html / detail_mode)는 노출하지 않습니다.
interface ProductDetail {
  slug: string
  detail_mode: 'default' | 'custom'
  custom_html: string | null
}

export function useProductDetail(productSlug: string) {
  const [detail, setDetail] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productSlug) return

    const fetchDetail = async () => {
      const { data, error } = await supabase
        .from('admin_product_details')
        .select('slug, published_detail_mode, published_html, published_at')
        .eq('slug', productSlug)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = "Row not found" — 해당 slug의 상세 설정이 없으면 default 모드 사용
        console.error('[useProductDetail] error:', error)
      }

      // 배포된 상태를 레거시 인터페이스로 매핑 (기존 컴포넌트 호환)
      const publishedMode = (data?.published_detail_mode as 'default' | 'custom' | null) ?? 'default'
      setDetail({
        slug: productSlug,
        detail_mode: publishedMode,
        custom_html: data?.published_html ?? null,
      })
      setLoading(false)
    }

    fetchDetail()
  }, [productSlug])

  const isCustomMode = detail?.detail_mode === 'custom' && !!detail?.custom_html

  return { detail, isCustomMode, loading }
}
