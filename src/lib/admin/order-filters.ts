/**
 * 관리자 주문 목록 필터 — 목록 조회(`/api/admin/orders`)와
 * 매출 엑셀 내보내기(`/api/admin/orders/export`)가 동일한 조건을 쓰도록 공유한다.
 */

const ALLOWED_STATUSES = [
  'pending', 'paid', 'preparing', 'shipping', 'delivered', 'cancel_requested', 'cancelled',
]

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export interface AdminOrderFilters {
  statuses: string[]
  influencer: 'true' | 'false' | null
  search: string | null
  dateFrom: string | null
  dateTo: string | null
  /** 특정 주문만 (체크박스 선택 내보내기) */
  ids: string[]
}

export function parseAdminOrderFilters(searchParams: URLSearchParams): AdminOrderFilters {
  const status = searchParams.get('status')
  const influencer = searchParams.get('influencer')
  const search = searchParams.get('search')?.trim() || null
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const ids = searchParams.get('ids')

  return {
    statuses: status
      ? status.split(',').map(s => s.trim()).filter(s => ALLOWED_STATUSES.includes(s))
      : [],
    influencer: influencer === 'true' || influencer === 'false' ? influencer : null,
    search,
    dateFrom: dateFrom && DATE_PATTERN.test(dateFrom) ? dateFrom : null,
    dateTo: dateTo && DATE_PATTERN.test(dateTo) ? dateTo : null,
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
}

/**
 * 주문 쿼리에 상태/인플루언서/검색어/기간/ID 필터를 적용한다.
 * 기간은 KST 기준 하루 경계로 환산해 `created_at`(UTC)에 대응시킨다.
 */
export function applyAdminOrderFilters<T>(query: T, filters: AdminOrderFilters): T {
  let result = query as unknown as FilterableQuery

  if (filters.ids.length > 0) {
    result = result.in('id', filters.ids)
  }

  if (filters.statuses.length === 1) {
    result = result.eq('status', filters.statuses[0])
  } else if (filters.statuses.length > 1) {
    result = result.in('status', filters.statuses)
  }

  if (filters.influencer === 'true') {
    result = result.eq('is_influencer', true)
  } else if (filters.influencer === 'false') {
    result = result.eq('is_influencer', false)
  }

  if (filters.search) {
    const term = sanitizeSearchTerm(filters.search)
    if (term) {
      result = result.or(
        `order_number.ilike.%${term}%,recipient_name.ilike.%${term}%,phone.ilike.%${term}%`
      )
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
