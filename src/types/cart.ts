// 장바구니 및 주문 상품 관련 타입 정의

export type ProductType = 'image_analysis' | 'image_analysis_paper' | 'figure_diffuser' | 'personal_scent' | 'graduation' | 'signature' | 'chemistry_set' | 'payment_test' | 'today_scent'

// 시향지 애드온 옵션 — image_analysis(아이돌 이미지) / chemistry_set(케미) 결제 단계에서
// 10ml 대신 선택할 수 있는 4,000원 저가 옵션. size 코드는 상품 공통으로 'scent_paper'.
export const SCENT_PAPER_SIZE = 'scent_paper'
export const SCENT_PAPER_PRICE = 4000
// size 코드가 시향지 옵션인지 판정 (관리자 주문/체크아웃 라벨링용)
export function isScentPaperSize(size: string): boolean {
  return size === SCENT_PAPER_SIZE
}

// AI 분석 없이 판매되는 카탈로그 상품 — analysis_id / layering_session_id 가 필요 없다.
// (DB 의 *_product_ref_check 제약 면제 목록과 일치시켜야 함)
export const ANALYSIS_OPTIONAL_PRODUCT_TYPES: readonly ProductType[] = ['signature', 'payment_test', 'today_scent']

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
  size: '10ml' | '50ml' | 'set' | 'set_10ml' | 'set_50ml' | 'scent_paper'
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
  size: '10ml' | '50ml' | 'set' | 'set_10ml' | 'set_50ml' | 'scent_paper'
  price: number
  quantity?: number
  image_url?: string
  analysis_data?: object
}

// 장바구니 수정 요청 타입
export interface UpdateCartItemRequest {
  size?: '10ml' | '50ml' | 'set' | 'set_10ml' | 'set_50ml' | 'scent_paper'
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
    { size: SCENT_PAPER_SIZE, price: SCENT_PAPER_PRICE, label: '시향지', shippingFee: DEFAULT_SHIPPING_FEE },
  ],
  image_analysis_paper: [
    { size: 'set', price: 4000, label: 'AI 이미지 분석 시향지', shippingFee: DEFAULT_SHIPPING_FEE },
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
    { size: SCENT_PAPER_SIZE, price: SCENT_PAPER_PRICE, label: '시향지 2매', shippingFee: DEFAULT_SHIPPING_FEE },
  ],
  payment_test: [
    { size: '10ml', price: 1000, label: '결제 테스트 상품', shippingFee: 0 },
  ],
  // 오늘의 향 — AI 분석 없이 판매되는 카탈로그 상품. 가격/용량은 image_analysis와 동일.
  today_scent: [
    { size: '10ml', price: 24000, label: '오늘의 향 10ml', shippingFee: DEFAULT_SHIPPING_FEE },
    { size: '50ml', price: 48000, label: '오늘의 향 50ml', shippingFee: DEFAULT_SHIPPING_FEE },
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
  image_analysis_paper: {
    label: 'AI 이미지 분석 시향지',
    labelShort: '시향지',
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300',
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
  today_scent: {
    label: '오늘의 향',
    labelShort: '오늘의 향',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
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
  if (productType === 'image_analysis_paper') return 'set'
  if (productType === 'chemistry_set') return 'set_10ml'
  return '10ml'
}

export function getDefaultPrice(productType: ProductType): number {
  switch (productType) {
    case 'payment_test':
      return 1000
    case 'image_analysis_paper':
      return 4000
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
