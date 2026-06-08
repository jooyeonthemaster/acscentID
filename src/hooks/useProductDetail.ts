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

function getVisibleTextLength(html: string) {
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('[data-ac-page-config="1"], script, style, svg').forEach((node) => node.remove())
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim().length
  }

  return html
    .replace(/<[^>]*data-ac-page-config=["']1["'][^>]*><\/[^>]+>/g, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .length
}

function isRenderableCustomHtml(html: string | null | undefined) {
  if (!html?.trim()) return false

  const hasBuilderMarkup =
    html.includes('data-ac-detail-builder="1"') ||
    html.includes("data-ac-detail-builder='1'") ||
    html.includes('data-ac-block')
  if (hasBuilderMarkup) return true

  const hasMedia = /<(img|picture|video|iframe)\b/i.test(html)
  if (hasMedia) return true

  // 관리자 미리보기/페이지 설정만 저장된 불완전한 HTML이 기본 상세를 덮지 않도록 방어한다.
  return getVisibleTextLength(html) >= 300
}

export function useProductDetail(productSlug: string) {
  const [detail, setDetail] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productSlug) return

    const fetchDetail = async () => {
      setLoading(true)
      const isAdminPreview =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('adminPreview') === '1'

      if (isAdminPreview) {
        try {
          const res = await fetch(`/api/admin/products/${productSlug}/preview-detail`, {
            cache: 'no-store',
          })
          if (res.ok) {
            const json = await res.json()
            setDetail(json.detail as ProductDetail)
            setLoading(false)
            return
          }
        } catch (error) {
          console.error('[useProductDetail] admin preview error:', error)
        }
      }

      const { data, error } = await supabase
        .from('admin_product_details')
        .select('slug, published_detail_mode, published_html, published_at')
        .eq('slug', productSlug)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = "Row not found" — 해당 slug의 상세 설정이 없으면 default 모드 사용
        console.error('[useProductDetail] error:', error)
      }

      // 배포된 상태를 레거시 인터페이스로 매핑 (기존 컴포넌트 호환)
      const rawPublishedMode = (data?.published_detail_mode as 'default' | 'custom' | null) ?? 'default'
      const publishedHtml = data?.published_html ?? null
      const publishedMode =
        rawPublishedMode === 'custom' && isRenderableCustomHtml(publishedHtml)
          ? 'custom'
          : 'default'
      setDetail({
        slug: productSlug,
        detail_mode: publishedMode,
        custom_html: publishedMode === 'custom' ? publishedHtml : null,
      })
      setLoading(false)
    }

    fetchDetail()
  }, [productSlug])

  const isCustomMode = detail?.detail_mode === 'custom' && !!detail?.custom_html

  return { detail, isCustomMode, loading }
}
