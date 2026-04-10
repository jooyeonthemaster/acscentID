'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

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
        .select('*')
        .eq('slug', productSlug)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = "Row not found" — 해당 slug의 상세 설정이 없으면 default 모드 사용
        console.error('[useProductDetail] error:', error)
      }

      setDetail(data || { slug: productSlug, detail_mode: 'default', custom_html: null })
      setLoading(false)
    }

    fetchDetail()
  }, [productSlug])

  const isCustomMode = detail?.detail_mode === 'custom' && !!detail?.custom_html

  return { detail, isCustomMode, loading }
}
