/**
 * 오프라인 결제 증빙 목록 필터 — 목록 조회(`/api/admin/offline-proofs`)와
 * 엑셀 내보내기(`/api/admin/offline-proofs/export`)가 동일한 조건을 쓰도록 공유한다.
 * (오프라인 택배 접수 `offline-shipping-filters.ts`와 동일한 구조)
 */

export const OFFLINE_PROOF_STATUSES = ['received', 'approved', 'paid', 'rejected'] as const

export type OfflineProofStatus = (typeof OFFLINE_PROOF_STATUSES)[number]

export const OFFLINE_PROOF_STATUS_LABELS: Record<OfflineProofStatus, string> = {
  received: '접수완료',
  approved: '확인완료',
  paid: '입금완료',
  rejected: '반려',
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface OfflineProofFilters {
  statuses: string[]
  search: string | null
  dateFrom: string | null
  dateTo: string | null
  /** 이 상품이 들어간 접수만 */
  productId: string | null
  /** 특정 접수만 (체크박스 선택 내보내기) */
  ids: string[]
}

export function parseOfflineProofFilters(searchParams: URLSearchParams): OfflineProofFilters {
  const status = searchParams.get('status')
  const search = searchParams.get('search')?.trim() || null
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const productId = searchParams.get('product')
  const ids = searchParams.get('ids')

  return {
    statuses: status
      ? status.split(',').map(s => s.trim()).filter(s => (OFFLINE_PROOF_STATUSES as readonly string[]).includes(s))
      : [],
    search,
    dateFrom: dateFrom && DATE_PATTERN.test(dateFrom) ? dateFrom : null,
    dateTo: dateTo && DATE_PATTERN.test(dateTo) ? dateTo : null,
    productId: productId && UUID_PATTERN.test(productId) ? productId : null,
    ids: ids ? ids.split(',').map(s => s.trim()).filter(Boolean) : [],
  }
}

/** PostgREST `or()` 문법을 깨뜨리는 문자 제거 */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%*\\]/g, '').trim()
}

/** 'YYYY-MM-DD' → KST 하루 경계의 UTC ISO 문자열 */
function kstBoundary(date: string, edge: 'start' | 'end'): string | null {
  const iso = edge === 'start'
    ? `${date}T00:00:00.000+09:00`
    : `${date}T23:59:59.999+09:00`
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

interface FilterableQuery {
  eq(column: string, value: unknown): FilterableQuery
  in(column: string, values: unknown[]): FilterableQuery
  gte(column: string, value: unknown): FilterableQuery
  lte(column: string, value: unknown): FilterableQuery
  or(filters: string): FilterableQuery
  contains(column: string, value: string): FilterableQuery
}

/**
 * 접수 쿼리에 상태/상품/검색어/기간/ID 필터를 적용한다.
 * 기간은 접수일 기준 — KST 하루 경계로 환산해 `created_at`(UTC)에 대응시킨다.
 * 검색어는 계좌번호를 하이픈 없이 저장하므로 숫자만 뽑은 값으로도 한 번 더 찾는다.
 */
export function applyOfflineProofFilters<T>(query: T, filters: OfflineProofFilters): T {
  let result = query as unknown as FilterableQuery

  if (filters.ids.length > 0) {
    result = result.in('id', filters.ids)
  }

  if (filters.statuses.length === 1) {
    result = result.eq('status', filters.statuses[0])
  } else if (filters.statuses.length > 1) {
    result = result.in('status', filters.statuses)
  }

  // jsonb 포함 검사 — 문자열로 넘겨야 PostgREST `cs.[...]`(jsonb)로 나간다 (배열을 넘기면 Postgres 배열 문법)
  if (filters.productId) {
    result = result.contains('items', JSON.stringify([{ product_id: filters.productId }]))
  }

  if (filters.search) {
    const term = sanitizeSearchTerm(filters.search)
    if (term) {
      const conditions = [
        `request_number.ilike.%${term}%`,
        `name.ilike.%${term}%`,
        `phone.ilike.%${term}%`,
        `bank_name.ilike.%${term}%`,
      ]
      const digits = term.replace(/\D/g, '')
      if (digits.length >= 3) conditions.push(`account_number.ilike.%${digits}%`)
      result = result.or(conditions.join(','))
    }
  }

  if (filters.dateFrom) {
    const from = kstBoundary(filters.dateFrom, 'start')
    if (from) result = result.gte('created_at', from)
  }

  if (filters.dateTo) {
    const to = kstBoundary(filters.dateTo, 'end')
    if (to) result = result.lte('created_at', to)
  }

  return result as unknown as T
}
