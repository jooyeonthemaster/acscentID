'use client'

import { useMemo, useState } from 'react'
import { useProductImages } from '@/hooks/useAdminContent'
import {
  CURATED_GALLERIES,
  mergeCuratedWithAdmin,
  type MergedGalleryImage,
} from '@/lib/products/detail-images'

/**
 * 큐레이션 갤러리 훅 — 승인된 로컬 이미지를 우선 노출하고,
 * 관리자 갤러리 이미지를 중복 제거해 뒤에 붙인다.
 * UnifiedDetailHero/DesktopDetailHero의 `images` controlled prop 형태를 반환한다.
 */
export function useCuratedGallery(productSlug: string) {
  const { imageUrls, loading: adminLoading } = useProductImages(productSlug)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const curated = CURATED_GALLERIES[productSlug] ?? []

  const images: MergedGalleryImage[] = useMemo(
    () => mergeCuratedWithAdmin(curated, adminLoading ? [] : imageUrls),
    [curated, adminLoading, imageUrls],
  )

  const urls = useMemo(() => images.map((image) => image.src), [images])
  const safeIndex = selectedIndex < urls.length ? selectedIndex : 0
  const current = images[safeIndex]

  return {
    images,
    current,
    controlled: {
      urls,
      // 큐레이션 이미지가 있으면 로컬 자산이 즉시 준비되므로 로딩을 띄우지 않는다
      loading: curated.length > 0 ? false : adminLoading,
      selectedIndex: safeIndex,
      onSelect: setSelectedIndex,
    },
  }
}
