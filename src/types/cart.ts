// 장바구니 및 주문 상품 관련 타입 정의

export type ProductType = 'image_analysis' | 'figure_diffuser' | 'personal_scent' | 'graduation' | 'signature' | 'chemistry_set' | 'payment_test'

// DB cart_items 테이블 타입
export interface CartItem {
  id: string
  user_id: string
  analysis_id: string | null
  layering_session_id: string | null
  product_type: ProductType
  perfume_name: string
  perfume_brand: string | null
  twitter_name: string | null
  size: '10ml' | '50ml' | 'set' | 'set_10ml' | 'set_50ml'
  price: number
  quantity: number
  image_url: string | null
  analysis_data: object | null
  created_at: string
  updated_at: string
}

// 장바구니 추가 요청 타입
// chemistry_set: layering_session_id 필수, analysis_id 는 비움
// 그 외:        analysis_id 필수, layering_session_id 는 비움
export interface AddToCartRequest {
  analysis_id?: string | null
  layering_session_id?: string | null
  product_type: ProductType
  perfume_name: string
  perfume_brand?: string
  twitter_name?: string
  size: '10ml' | '50ml' | 'set' | 'set_10ml' | 'set_50ml'
  price: number
  quantity?: number
  image_url?: string
  analysis_data?: object
}

// 장바구니 수정 요청 타입
export interface UpdateCartItemRequest {
  size?: '10ml' | '50ml' | 'set' | 'set_10ml' | 'set_50ml'
  price?: number
  quantity?: number
}

// 주문 상품 타입 (order_items 테이블)
export interface OrderItem {
  id: string
  order_id: string
  analysis_id: string | null
  layering_session_id: string | null
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

// 배송비 정책: 5만원 이상 무료배송, 미만 시 3,000원
export const FREE_SHIPPING_THRESHOLD = 50000
export const DEFAULT_SHIPPING_FEE = 3000

export const PRODUCT_PRICING: Record<ProductType, PricingOption[]> = {
  image_analysis: [
    { size: '10ml', price: 24000, label: '10ml 퍼퓸', shippingFee: DEFAULT_SHIPPING_FEE },
    { size: '50ml', price: 48000, label: '50ml 퍼퓸', shippingFee: DEFAULT_SHIPPING_FEE },
  ],
  figure_diffuser: [
    { size: 'set', price: 48000, label: '피규어+디퓨저 세트', shippingFee: DEFAULT_SHIPPING_FEE },
  ],
  personal_scent: [
    { size: '10ml', price: 24000, label: '10ml 퍼퓸', shippingFee: DEFAULT_SHIPPING_FEE },
    { size: '50ml', price: 48000, label: '50ml 퍼퓸', shippingFee: DEFAULT_SHIPPING_FEE },
  ],
  graduation: [
    { size: '10ml', price: 34000, label: '졸업 퍼퓸 10ml', shippingFee: DEFAULT_SHIPPING_FEE },
  ],
  signature: [
    { size: '10ml', price: 34000, label: 'SIGNATURE 뿌덕퍼퓸 10ml', shippingFee: DEFAULT_SHIPPING_FEE },
  ],
  chemistry_set: [
    { size: 'set_10ml', price: 38000, label: '레이어링 퍼퓸 세트 10ml x 2', shippingFee: DEFAULT_SHIPPING_FEE },
    { size: 'set_50ml', price: 60000, label: '레이어링 퍼퓸 세트 50ml x 2', shippingFee: DEFAULT_SHIPPING_FEE },
  ],
  payment_test: [
    { size: '10ml', price: 1000, label: '결제 테스트 상품', shippingFee: 0 },
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
  graduation: {
    label: '졸업 퍼퓸',
    labelShort: '졸업',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
  },
  signature: {
    label: '시그니처 퍼퓸',
    labelShort: '시그니처',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
  },
  chemistry_set: {
    label: '레이어링 퍼퓸 세트',
    labelShort: '레이어링',
    bg: 'bg-violet-100',
    text: 'text-violet-700',
    border: 'border-violet-300',
  },
  payment_test: {
    label: '결제 테스트',
    labelShort: '테스트',
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
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
  if (productType === 'figure_diffuser') return 'set'
  if (productType === 'chemistry_set') return 'set_10ml'
  return '10ml'
}

export function getDefaultPrice(productType: ProductType): number {
  switch (productType) {
    case 'payment_test':
      return 1000
    case 'figure_diffuser':
      return 48000
    case 'graduation':
    case 'signature':
      return 34000
    case 'chemistry_set':
      return 38000
    default:
      return 24000
  }
}

// 전체 장바구니 금액 계산
export function calculateCartTotals(
  items: CartItem[],
  couponDiscountPercent?: number,
  _couponType?: string
): {
  subtotal: number
  shippingFee: number
  discount: number
  total: number
} {
  // 상품 소계
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // 배송비: 5만원 이상 무료배송
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : (items.length > 0 ? DEFAULT_SHIPPING_FEE : 0)

  // 쿠폰 할인: 퍼센트 할인
  let discount = 0
  if (couponDiscountPercent) {
    discount = Math.floor(subtotal * (couponDiscountPercent / 100))
  }

  const total = Math.max(0, subtotal + shippingFee - discount)

  return { subtotal, shippingFee, discount, total }
}

// 가격 포맷팅
export function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR')
}

// 결제 방법
export type PaymentMethod = 'bank_transfer' | 'card' | 'kakao_pay' | 'naver_pay'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: '계좌이체 (무통장입금)',
  card: '신용/체크카드',
  kakao_pay: '카카오페이',
  naver_pay: '네이버페이',
}
