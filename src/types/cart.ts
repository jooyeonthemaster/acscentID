// 장바구니 및 주문 상품 관련 타입 정의

export type ProductType = 'image_analysis' | 'figure_diffuser' | 'personal_scent'

// DB cart_items 테이블 타입
export interface CartItem {
  id: string
  user_id: string
  analysis_id: string | null
  product_type: ProductType
  perfume_name: string
  perfume_brand: string | null
  twitter_name: string | null
  size: '10ml' | '50ml' | 'set'
  price: number
  quantity: number
  image_url: string | null
  analysis_data: object | null
  created_at: string
  updated_at: string
}

// 장바구니 추가 요청 타입
export interface AddToCartRequest {
  analysis_id: string
  product_type: ProductType
  perfume_name: string
  perfume_brand?: string
  twitter_name?: string
  size: '10ml' | '50ml' | 'set'
  price: number
  quantity?: number
  image_url?: string
  analysis_data?: object
}

// 장바구니 수정 요청 타입
export interface UpdateCartItemRequest {
  size?: '10ml' | '50ml' | 'set'
  price?: number
  quantity?: number
}

// 주문 상품 타입 (order_items 테이블)
export interface OrderItem {
  id: string
  order_id: string
  analysis_id: string | null
  product_type: ProductType
  perfume_name: string
  perfume_brand: string | null
  twitter_name: string | null
  size: string
  unit_price: number
  quantity: number
  subtotal: number
  image_url: string | null
  analysis_data: object | null
  created_at: string
}

// 상품별 가격 정책
export interface PricingOption {
  size: string
  price: number
  label: string
  shippingFee: number
}

export const PRODUCT_PRICING: Record<ProductType, PricingOption[]> = {
  image_analysis: [
    { size: '10ml', price: 24000, label: '스프레이 10ml', shippingFee: 3000 },
    { size: '50ml', price: 48000, label: '스프레이 50ml', shippingFee: 0 },
  ],
  figure_diffuser: [
    { size: 'set', price: 48000, label: '피규어+디퓨저 세트', shippingFee: 0 },
  ],
  personal_scent: [
    { size: '10ml', price: 24000, label: '스프레이 10ml', shippingFee: 3000 },
    { size: '50ml', price: 48000, label: '스프레이 50ml', shippingFee: 0 },
  ],
}

// 상품 타입 뱃지 스타일
export interface ProductTypeBadge {
  label: string
  labelShort: string // 모바일용 짧은 라벨
  bg: string
  text: string
  border: string
}

export const PRODUCT_TYPE_BADGES: Record<ProductType, ProductTypeBadge> = {
  image_analysis: {
    label: 'AI 이미지 분석',
    labelShort: 'AI 분석',
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-300',
  },
  figure_diffuser: {
    label: '피규어 디퓨저',
    labelShort: '피규어',
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
    border: 'border-cyan-300',
  },
  personal_scent: {
    label: '퍼스널 센트',
    labelShort: '퍼스널',
    bg: 'bg-pink-100',
    text: 'text-pink-700',
    border: 'border-pink-300',
  },
}

// 가격 관련 유틸리티 함수
export function getPriceBySize(productType: ProductType, size: string): number {
  const pricing = PRODUCT_PRICING[productType]
  const option = pricing.find((p) => p.size === size)
  return option?.price || pricing[0].price
}

export function getShippingFee(productType: ProductType, size: string): number {
  const pricing = PRODUCT_PRICING[productType]
  const option = pricing.find((p) => p.size === size)
  return option?.shippingFee || 0
}

export function getDefaultSize(productType: ProductType): string {
  return productType === 'figure_diffuser' ? 'set' : '10ml'
}

export function getDefaultPrice(productType: ProductType): number {
  return productType === 'figure_diffuser' ? 48000 : 24000
}

// 전체 장바구니 금액 계산
export function calculateCartTotals(
  items: CartItem[],
  couponDiscountPercent?: number
): {
  subtotal: number
  shippingFee: number
  discount: number
  total: number
} {
  // 상품 소계
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // 배송비: 50ml 또는 피규어 세트가 포함되면 무료
  const hasFreeShipping = items.some(
    (item) => item.size === '50ml' || item.size === 'set'
  )
  const shippingFee = hasFreeShipping ? 0 : (items.length > 0 ? 3000 : 0)

  // 쿠폰 할인: 전체 소계에 적용
  const discount = couponDiscountPercent
    ? Math.floor(subtotal * (couponDiscountPercent / 100))
    : 0

  const total = subtotal + shippingFee - discount

  return { subtotal, shippingFee, discount, total }
}

// 가격 포맷팅
export function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR')
}
