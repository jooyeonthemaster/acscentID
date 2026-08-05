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
  { id: 'shippingWhiteOpen', src: '/images/product-detail/shipping-white-open-square.png', provenance: 'actual' },
  { id: 'shippingOuterBox', src: '/images/product-detail/shipping-outer-box-square.png', provenance: 'actual' },
]

/**
 * 단품 상품 — 승인된 갤러리 순서 (01_상세페이지_23장_선정가이드.md 기준).
 * 생성 이미지이므로 provenance는 'visualization' (제품 연출 이미지 배지).
 */
export const PERFUME_FIFTY_GALLERY: CuratedDetailImage[] = [
  { id: 'storeFiftyHero', src: '/images/products/generated/perfume-50ml/perfume-50ml-01.png', provenance: 'visualization' },
  { id: 'storeFiftySprayer', src: '/images/products/generated/perfume-50ml/perfume-50ml-03.png', provenance: 'visualization' },
  { id: 'storeFiftySize', src: '/images/products/generated/perfume-50ml/perfume-50ml-04.png', provenance: 'visualization' },
  { id: 'storeFiftyPackage', src: '/images/products/generated/perfume-50ml/perfume-50ml-05.png', provenance: 'visualization' },
]

export const PERFUME_TEN_GALLERY: CuratedDetailImage[] = [
  { id: 'storeTenHero', src: '/images/products/generated/perfume-10ml/perfume-10ml-01.png', provenance: 'visualization' },
  { id: 'storeTenSprayer', src: '/images/products/generated/perfume-10ml/perfume-10ml-03.png', provenance: 'visualization' },
  { id: 'storeTenSize', src: '/images/products/generated/perfume-10ml/perfume-10ml-04.png', provenance: 'visualization' },
  { id: 'storeTenCarry', src: '/images/products/generated/perfume-10ml/perfume-10ml-05.png', provenance: 'visualization' },
]

export const SCENT_PAPER_GALLERY: CuratedDetailImage[] = [
  { id: 'storePaperHandLight', src: '/images/products/generated/scent-paper/scent-paper-hand-light-01.png', provenance: 'visualization' },
]

/** 사주 분석 퍼퓸&디퓨저 클리커 키링 — 승인된 갤러리 순서 (원본: 사주상품사진/, 실사) */
export const SAJU_PRIMARY_IMAGE = '/images/product-detail/saju-lineup-square.png'

export const SAJU_GALLERY: CuratedDetailImage[] = [
  { id: 'sajuLineup', src: SAJU_PRIMARY_IMAGE, provenance: 'actual' },
  { id: 'sajuFiftyReport', src: '/images/product-detail/saju-50ml-report-square.png', provenance: 'actual' },
  { id: 'sajuTenReport', src: '/images/product-detail/saju-10ml-report-square.png', provenance: 'actual' },
  { id: 'sajuClickerFive', src: '/images/product-detail/saju-clicker-five-square.png', provenance: 'actual' },
  { id: 'sajuClickerEngraving', src: '/images/product-detail/saju-clicker-engraving-square.png', provenance: 'actual' },
  { id: 'sajuClickerBothSides', src: '/images/product-detail/saju-clicker-both-sides-square.png', provenance: 'actual' },
]

export const CURATED_GALLERIES: Record<string, CuratedDetailImage[]> = {
  'idol-image': IDOL_IMAGE_GALLERY,
  chemistry: CHEMISTRY_GALLERY,
  'perfume-50ml': PERFUME_FIFTY_GALLERY,
  'perfume-10ml': PERFUME_TEN_GALLERY,
  'scent-paper': SCENT_PAPER_GALLERY,
  saju: SAJU_GALLERY,
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
