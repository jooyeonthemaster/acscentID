/**
 * 택배 교환권 — 손님 폼(/ship), 접수 API, 관리자 발급 화면(/admin/ship-coupons)이 같이 쓰는 값.
 * 테이블은 supabase/migrations/20261028_offline_shipping_coupons.sql 로 만든다.
 */

export const SHIP_COUPON_TABLE = 'offline_shipping_coupons'

/** 발급 화면의 상품 토글 — 목록에 없는 상품은 직접 입력 */
export const SHIP_COUPON_PRODUCT_PRESETS = ['지젤 코스터', '지젤 스프링노트', '지젤 마스킹테이프']

export const SHIP_COUPON_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const SHIP_COUPON_CODE_LENGTH = 8
/** 한 번 접수에 묶을 수 있는 교환권 수 */
export const SHIP_COUPON_MAX_PER_REQUEST = 10
export const SHIP_COUPON_MAX_ISSUE = 200

export type ShipCouponStatus = 'active' | 'used' | 'void'

export const SHIP_COUPON_STATUS_LABELS: Record<ShipCouponStatus, string> = {
  active: '미사용',
  used: '접수됨',
  void: '취소',
}

/** 대소문자·하이픈·공백을 무시하고 비교용 코드로 */
export function normalizeShipCouponCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function isShipCouponCode(code: string): boolean {
  return code.length === SHIP_COUPON_CODE_LENGTH && [...code].every((ch) => SHIP_COUPON_CODE_ALPHABET.includes(ch))
}

/** ABCDEFGH → ABCD-EFGH */
export function formatShipCouponCode(code: string): string {
  return code.length === SHIP_COUPON_CODE_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code
}

/** 인쇄 QR은 항상 운영 주소로 — 로컬에서 발급해도 손님 폰에서 열려야 한다 */
export function buildShipCouponUrl(code: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || ''
  const siteUrl = configured && !/localhost|127\.0\.0\.1/.test(configured) ? configured : 'https://www.acscent.co.kr'
  return `${siteUrl.replace(/\/$/, '')}/ship?code=${code}`
}

/** 접수 건의 상품 칸 — 같은 상품은 묶어서 '지젤 코스터 ×2, 지젤 스프링노트' */
export function summarizeShipCouponProducts(productNames: string[]): string {
  const counts = new Map<string, number>()
  for (const name of productNames) counts.set(name, (counts.get(name) || 0) + 1)
  return [...counts].map(([name, count]) => (count > 1 ? `${name} ×${count}` : name)).join(', ')
}

/** 테이블이 아직 없을 때(SQL 실행 전) — PostgREST 가 PGRST205 를 준다 */
export function isShipCouponTableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return error.code === 'PGRST205' || error.code === '42P01'
}
