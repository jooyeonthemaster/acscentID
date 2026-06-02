import { redirect } from 'next/navigation'

// 가격 관리는 상품 관리(/admin/products)의 각 상품 페이지로 통합되었습니다.
// 기존 북마크/링크 호환을 위해 상품 목록으로 리다이렉트합니다.
export default function AdminProductPricingRedirect() {
  redirect('/admin/products')
}
