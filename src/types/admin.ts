// 관리자 페이지 타입 정의

import { ImageAnalysisResult } from './analysis'

// 상품 타입
export type ProductType = 'image_analysis' | 'figure_diffuser' | 'personal_scent' | 'graduation'

// 서비스 모드
export type ServiceMode = 'online' | 'offline'

// 상품 타입 한글 라벨
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  image_analysis: '최애 이미지 분석',
  figure_diffuser: '피규어 디퓨저',
  personal_scent: '퍼스널 센트',
  graduation: '졸업 퍼퓸',
}

// 서비스 모드 한글 라벨
export const SERVICE_MODE_LABELS: Record<ServiceMode, string> = {
  online: '온라인',
  offline: '오프라인 QR',
}

// QR 코드
export interface QRCode {
  id: string
  code: string
  product_type: ProductType
  service_mode: ServiceMode
  name: string | null
  location: string | null
  is_active: boolean
  scan_count: number
  analysis_count: number
  created_at: string
  updated_at: string
}

// 관리자용 분석 레코드
export interface AdminAnalysisRecord {
  id: string
  created_at: string
  user_id: string | null
  user_fingerprint: string | null
  product_type: ProductType
  service_mode: ServiceMode
  qr_code_id: string | null
  analysis_data: ImageAnalysisResult
  twitter_name: string
  perfume_name: string
  perfume_brand: string
  matching_keywords: string[]
  user_image_url: string | null
  idol_name: string | null
  // 조인된 데이터
  user_profile?: {
    id: string
    name: string | null
    email: string | null
    provider: string | null
  }
  feedback?: AdminFeedbackRecord | null
}

// 관리자용 피드백 레코드
export interface AdminFeedbackRecord {
  id: string
  created_at: string
  result_id: string | null
  perfume_id: string
  perfume_name: string
  retention_percentage: number
  category_preferences: Record<string, string>
  specific_scents: Array<{ id: string; name: string; ratio: number }>
  notes: string | null
  generated_recipe: GeneratedRecipeData | null
}

// 생성된 레시피 데이터
export interface GeneratedRecipeData {
  granules: Array<{
    id: string
    name: string
    mainCategory: string
    drops: number
    ratio: number
    reason: string
  }>
  overallExplanation: string
  totalDrops: number
  estimatedStrength: 'light' | 'medium' | 'strong'
}

// 주문 상태
export type OrderStatus = 'pending' | 'paid' | 'shipping' | 'delivered' | 'cancel_requested' | 'cancelled'

// 주문 상태 한글 라벨
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '입금대기',
  paid: '입금완료',
  shipping: '배송중',
  delivered: '배송완료',
  cancel_requested: '취소요청',
  cancelled: '취소완료',
}

// 주문 상태 색상
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-blue-100 text-blue-700',
  shipping: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancel_requested: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-slate-100 text-slate-700',
}

// 관리자용 주문 레코드
export interface AdminOrderRecord {
  id: string
  order_number: string
  user_id: string
  perfume_name: string
  perfume_brand: string
  size: string
  price: number
  shipping_fee: number
  discount_amount: number
  original_price: number
  final_price: number
  recipient_name: string
  phone: string
  zip_code: string
  address: string
  address_detail: string | null
  memo: string | null
  status: OrderStatus
  created_at: string
  updated_at: string
  // 연관 데이터
  analysis_id?: string | null
  user_coupon_id?: string | null
}

// 관리자용 회원 레코드
export interface AdminMemberRecord {
  id: string
  email: string | null
  name: string | null
  provider: string
  referral_code: string | null
  referred_by: string | null
  created_at: string
  // 통계 데이터 (API에서 집계)
  analysis_count?: number
  order_count?: number
  // 추천 데이터 (API에서 집계)
  referred_count?: number
  referrer?: {
    name: string | null
    email: string | null
  } | null
}

// 대시보드 통계
export interface AdminDashboardStats {
  // 분석 통계
  totalAnalysis: number
  analysisToday: number
  analysisByProduct: Record<ProductType, number>
  analysisByMode: Record<ServiceMode, number>
  // 주문 통계
  totalOrders: number
  ordersToday: number
  ordersByStatus: Record<OrderStatus, number>
  // 매출 통계
  totalRevenue: number
  revenueToday: number
  // 회원 통계
  totalMembers: number
  newMembersToday: number
  // QR 통계
  totalQRCodes: number
  totalQRScans: number
}

// 페이지네이션
export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// API 응답 타입
export interface AdminListResponse<T> {
  data: T[]
  pagination: Pagination
}
