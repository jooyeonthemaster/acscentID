/**
 * 상세페이지 큐레이션 이미지 manifest.
 *
 * - 원본: 상품사진/06_상세페이지_목업/assets/actual-edited (실사 보정본)
 * - 배포 사본: public/images/product-detail (ASCII 안정 경로, 원본은 이동/삭제 금지)
 * - provenance
 *   - 'actual'        → "실제 상품 사진 기반" 배지
 *   - 'visualization' → "내부 구성 시각화" 배지 (생성 이미지, 주문별 실제 값과 다름)
 *
 * alt/caption 문구는 messages/*.json 의 `detailGallery.<id>` 네임스페이스에서
 * 로케일별로 관리한다. 이 파일은 경로·순서·출처의 단일 소스다.
 */

export type DetailImageProvenance = 'actual' | 'visualization'

export interface CuratedDetailImage {
  /** messages detailGallery.<id> 키와 1:1 매칭 */
  id: string
  src: string
  provenance: DetailImageProvenance
}

/** AI 이미지 분석 퍼퓸 — 승인된 갤러리 순서 (변경 시 기획 승인 필요) */
export const IDOL_IMAGE_GALLERY: CuratedDetailImage[] = [
  { id: 'aiTenReport', src: '/images/product-detail/ai-10ml-report-square.png', provenance: 'actual' },
  { id: 'aiFiftyReport', src: '/images/product-detail/ai-50ml-report-square.png', provenance: 'actual' },
  { id: 'aiFiftyFullSet', src: '/images/product-detail/ai-50ml-full-set-8056-square.png', provenance: 'actual' },
  { id: 'aiTenPouch', src: '/images/product-detail/ai-10ml-pouch-bright.png', provenance: 'actual' },
  { id: 'shippingOuterBox', src: '/images/product-detail/shipping-outer-box-square.png', provenance: 'actual' },
  { id: 'shippingWhiteOpen', src: '/images/product-detail/shipping-white-open-square.png', provenance: 'actual' },
]

/** 레이어링 퍼퓸 세트 — 승인된 갤러리 순서 */
export const CHEMISTRY_GALLERY: CuratedDetailImage[] = [
  { id: 'chemTenSet', src: '/images/product-detail/chemistry-10ml-set-square.png', provenance: 'actual' },
  { id: 'chemFiftySet', src: '/images/product-detail/chemistry-50ml-set-square.png', provenance: 'actual' },
  { id: 'chemReportPackage', src: '/images/product-detail/chemistry-report-package-square.png', provenance: 'actual' },
  { id: 'chemReportDetail', src: '/images/product-detail/chemistry-report-detail-visual.png', provenance: 'visualization' },
  { id: 'shippingWhiteOpen', src: '/images/product-detail/shipping-white-open-square.png', provenance: 'actual' },
  { id: 'shippingOuterBox', src: '/images/product-detail/shipping-outer-box-square.png', provenance: 'actual' },
]

export const CURATED_GALLERIES: Record<string, CuratedDetailImage[]> = {
  'idol-image': IDOL_IMAGE_GALLERY,
  chemistry: CHEMISTRY_GALLERY,
}

export interface MergedGalleryImage {
  src: string
  /** 큐레이션 이미지에만 존재. 관리자 업로드 이미지는 undefined */
  curated?: CuratedDetailImage
}

/**
 * 갤러리 노출 정책 (단일 관리 지점):
 * 1) 승인된 큐레이션 이미지를 승인된 순서대로 먼저 노출한다.
 * 2) 관리자 갤러리 이미지는 삭제/덮어쓰기 없이 그 뒤에 이어 붙이되,
 *    큐레이션과 동일한 URL은 중복 제거한다.
 */
export function mergeCuratedWithAdmin(
  curated: CuratedDetailImage[],
  adminUrls: string[],
): MergedGalleryImage[] {
  const seen = new Set(curated.map((image) => image.src))
  const merged: MergedGalleryImage[] = curated.map((image) => ({
    src: image.src,
    curated: image,
  }))
  for (const url of adminUrls) {
    if (!url || seen.has(url)) continue
    seen.add(url)
    merged.push({ src: url })
  }
  return merged
}
