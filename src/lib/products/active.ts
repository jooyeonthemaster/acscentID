/**
 * 상품 활성화 상태 공통 헬퍼.
 * - product_type(DB) → admin_products.slug 매핑을 한 곳에서 관리.
 * - 마이페이지 주문/분석 결과 카드에서 동일하게 사용하여 매핑 어긋남 방지.
 */

// product_type(DB) → admin_products.slug
// 매핑 안 된 타입(payment_test 등)은 활성으로 간주(차단 안 함).
export const PRODUCT_TYPE_TO_SLUG: Record<string, string> = {
  image_analysis: 'idol-image',
  figure_diffuser: 'figure',
  graduation: 'graduation',
  signature: 'le-quack',
  personal_scent: 'personal',
  chemistry_set: 'chemistry',
}

/**
 * product_type 문자열이 단종(비활성) 상태인지 판정.
 * 매핑 안 되어 있거나 productType이 비어있으면 false(=활성).
 *
 * @param productType orders/analyses 등의 product_type 컬럼 값
 * @param isProductActive useActiveProducts() 훅에서 반환되는 함수
 * @param productsLoading 훅 로딩 중이면 true → false 반환(깜빡임 방지)
 */
export function isProductTypeDiscontinued(
  productType: string | null | undefined,
  isProductActive: (slug: string) => boolean,
  productsLoading: boolean
): boolean {
  if (productsLoading) return false
  if (!productType) return false
  const slug = PRODUCT_TYPE_TO_SLUG[productType]
  if (!slug) return false
  return !isProductActive(slug)
}
