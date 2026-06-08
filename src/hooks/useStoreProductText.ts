'use client'

import { useTranslations } from 'next-intl'
import type { StoreProduct } from '@/lib/products/store-products'

export interface LocalizedStoreText {
  title: string
  shortLabel: string
  description: string
  included: string[]
}

type StoreProductLike = Pick<StoreProduct, 'slug' | 'title' | 'shortLabel' | 'description' | 'included'>

/**
 * 스토어 상품의 표시용 텍스트를 현재 로케일에 맞춰 반환한다.
 * 표준 상품(slug별 번역 키)이 있으면 번역을 사용하고, 없으면(관리자 커스텀 상품 등) DB/기본 값을 그대로 보여준다.
 * 한국어 로케일에는 store.items 번역을 두지 않으므로, 관리자가 편집한 DB 콘텐츠가 그대로 노출된다.
 */
export function useStoreProductText() {
  const t = useTranslations()

  return (product: StoreProductLike): LocalizedStoreText => {
    const base = `store.items.${product.slug}`
    const includedRaw = t.has(`${base}.included`) ? t.raw(`${base}.included`) : null
    return {
      title: t.has(`${base}.title`) ? t(`${base}.title`) : product.title,
      shortLabel: t.has(`${base}.shortLabel`) ? t(`${base}.shortLabel`) : product.shortLabel,
      description: t.has(`${base}.description`) ? t(`${base}.description`) : product.description,
      included: Array.isArray(includedRaw) ? (includedRaw as string[]) : product.included,
    }
  }
}
