// 기본 배송지 (user_profiles.preferences.shipping_address 에 저장)
export interface ShippingAddress {
  name: string
  phone: string // "010-1234-5678" 형식
  zipCode: string
  address: string
  addressDetail: string
}

// 전화번호 문자열 → 3분할 [앞, 중간, 뒤]
export function splitPhone(phone: string | undefined | null): [string, string, string] {
  if (!phone) return ['010', '', '']
  const parts = phone.split('-').map((p) => p.replace(/[^0-9]/g, ''))
  if (parts.length === 3) return [parts[0] || '010', parts[1] || '', parts[2] || '']
  // 하이픈 없이 들어온 경우 숫자만 추출해 분할
  const digits = phone.replace(/[^0-9]/g, '')
  if (digits.length >= 10) {
    const head = digits.slice(0, 3)
    const tail = digits.slice(-4)
    const mid = digits.slice(3, digits.length - 4)
    return [head, mid, tail]
  }
  return ['010', '', '']
}

// 3분할 → 전화번호 문자열
export function joinPhone(p1: string, p2: string, p3: string): string {
  return [p1, p2, p3].map((p) => (p || '').replace(/[^0-9]/g, '')).join('-')
}

// 값이 실제로 채워진 배송지인지 (빈 객체 방어)
export function isFilledAddress(a: Partial<ShippingAddress> | null | undefined): a is ShippingAddress {
  return !!(a && a.name && a.phone && a.zipCode && a.address)
}

// 서버 저장 전 정규화 (필드 trim, 알 수 없는 키 제거)
export function normalizeAddress(input: unknown): ShippingAddress {
  const o = (input ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  return {
    name: str(o.name),
    phone: str(o.phone),
    zipCode: str(o.zipCode),
    address: str(o.address),
    addressDetail: str(o.addressDetail),
  }
}
