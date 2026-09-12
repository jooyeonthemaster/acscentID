/**
 * 오프라인 택배 접수 목록 필터 — 목록 조회(`/api/admin/offline-shipping`)와
 * 배송 약식 엑셀 내보내기(`/api/admin/offline-shipping/export`)가 동일한 조건을 쓰도록 공유한다.
 * (관리자 주문 필터 `order-filters.ts`와 동일한 구조)
 */

export const OFFLINE_SHIPPING_STATUSES = [
  'received', 'preparing', 'shipping', 'delivered', 'cancelled',
] as const

export type OfflineShippingStatus = (typeof OFFLINE_SHIPPING_STATUSES)[number]

export const OFFLINE_SHIPPING_STATUS_LABELS: Record<OfflineShippingStatus, string> = {
  received: '접수완료',
  preparing: '상품준비중',
  shipping: '배송중',
  delivered: '배송완료',
  cancelled: '접수취소',
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export interface OfflineShippingFilters {
  statuses: string[]
  search: string | null
  dateFrom: string | null
  dateTo: string | null
  /** 특정 접수만 (체크박스 선택 내보내기) */
  ids: string[]
}

export function parseOfflineShippingFilters(searchParams: URLSearchParams): OfflineShippingFilters {
  const status = searchParams.get('status')
  const search = searchParams.get('search')?.trim() || null
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const ids = searchParams.get('ids')

  return {
    statuses: status
      ? status.split(',').map(s => s.trim()).filter(s => (OFFLINE_SHIPPING_STATUSES as readonly string[]).includes(s))
      : [],
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
 * 접수 쿼리에 상태/검색어/기간/ID 필터를 적용한다.
 * 기간은 KST 기준 하루 경계로 환산해 `created_at`(UTC)에 대응시킨다.
 */
export function applyOfflineShippingFilters<T>(query: T, filters: OfflineShippingFilters): T {
  let result = query as unknown as FilterableQuery

  if (filters.ids.length > 0) {
    result = result.in('id', filters.ids)
  }

  if (filters.statuses.length === 1) {
    result = result.eq('status', filters.statuses[0])
  } else if (filters.statuses.length > 1) {
    result = result.in('status', filters.statuses)
  }

  if (filters.search) {
    const term = sanitizeSearchTerm(filters.search)
    if (term) {
      result = result.or(
        `request_number.ilike.%${term}%,name.ilike.%${term}%,phone.ilike.%${term}%,product_name.ilike.%${term}%`
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
