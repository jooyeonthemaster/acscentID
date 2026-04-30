/**
 * 택배 운송장 처리 유틸리티 (현재 CJ대한통운만 지원)
 *
 * 정책 결정:
 *  - URL은 한 곳에서만 관리하여 CJ가 URL 구조를 변경할 때 단일 지점 패치 가능.
 *  - 운송장 번호는 항상 normalize 후 검증 → 외부 사이트로 보내기 전 안전성 확보.
 *  - 잘못된 형식이면 외부 링크 자체를 생성하지 않음 (XSS/Open Redirect 방어).
 */

export const CJ_INVOICE_REGEX = /^[0-9]{10,12}$/

export type CarrierId = 'cj'

export const CARRIER_LABELS: Record<CarrierId, string> = {
  cj: 'CJ대한통운',
}

/**
 * 운송장 번호 정규화 — 공백/하이픈 제거.
 * 사용자가 "1234-5678-9012" 처럼 입력해도 안전하게 처리.
 */
export function normalizeTrackingNumber(raw: string | null | undefined): string {
  if (!raw) return ''
  return String(raw).replace(/[\s-]/g, '')
}

/**
 * 운송장 번호 형식 검증. 현재 CJ 전용 (10~12자리 숫자).
 * carrier 인자는 미래 확장 대비 시그니처에 유지.
 */
export function isValidTrackingNumber(raw: string | null | undefined, carrier: CarrierId = 'cj'): boolean {
  const normalized = normalizeTrackingNumber(raw)
  switch (carrier) {
    case 'cj':
    default:
      return CJ_INVOICE_REGEX.test(normalized)
  }
}

/**
 * 외부 배송조회 URL 생성.
 *  - CJ대한통운 자동조회: https://trace.cjlogistics.com/next/tracking.html?wblNo={번호}
 *  - 잘못된 번호이거나 미지원 택배사면 null 반환.
 *
 * 호출자는 null 반환 시 링크를 만들지 말 것 (외부로 보내면 안 됨).
 */
export function getTrackingUrl(
  trackingNumber: string | null | undefined,
  carrier: CarrierId = 'cj'
): string | null {
  const normalized = normalizeTrackingNumber(trackingNumber)
  if (!isValidTrackingNumber(normalized, carrier)) return null

  switch (carrier) {
    case 'cj':
    default:
      return `https://trace.cjlogistics.com/next/tracking.html?wblNo=${encodeURIComponent(normalized)}`
  }
}

/**
 * 외부 링크 안전 속성 (reverse tabnabbing, referrer leak 방어).
 * <a {...EXTERNAL_LINK_SAFE_ATTRS} href={...}>...</a>
 */
export const EXTERNAL_LINK_SAFE_ATTRS = {
  target: '_blank' as const,
  rel: 'noopener noreferrer' as const,
  referrerPolicy: 'no-referrer' as const,
}
