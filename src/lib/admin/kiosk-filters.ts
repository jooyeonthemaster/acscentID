/**
 * 키오스크 분석 기록 목록 필터 — 목록 조회(`/api/admin/kiosk`)와 통계(`/api/admin/kiosk/stats`)가
 * 동일한 조건을 쓰도록 공유한다. (`offline-shipping-filters.ts`와 동일한 구조)
 */

export const KIOSK_PROGRAMS = ['personal', 'idol', 'saju'] as const

export type KioskProgram = (typeof KIOSK_PROGRAMS)[number]

export const KIOSK_PROGRAM_LABELS: Record<KioskProgram, string> = {
  personal: '내 이미지',
  idol: '최애 이미지',
  saju: '사주 향',
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export interface KioskFilters {
  programs: string[]
  search: string | null
  dateFrom: string | null
  dateTo: string | null
  /** 'real' = 실제 분석만, 'mock' = 데모 결과만, null = 전체 */
  mock: 'real' | 'mock' | null
}

export function parseKioskFilters(searchParams: URLSearchParams): KioskFilters {
  const program = searchParams.get('program')
  const search = searchParams.get('search')?.trim() || null
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const mock = searchParams.get('mock')

  return {
    programs: program
      ? program
          .split(',')
          .map((s) => s.trim())
          .filter((s) => (KIOSK_PROGRAMS as readonly string[]).includes(s))
      : [],
    search,
    dateFrom: dateFrom && DATE_PATTERN.test(dateFrom) ? dateFrom : null,
    dateTo: dateTo && DATE_PATTERN.test(dateTo) ? dateTo : null,
    mock: mock === 'real' || mock === 'mock' ? mock : null,
  }
}

/** PostgREST `or()` 문법을 깨뜨리는 문자 제거 */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%*\\]/g, '').trim()
}

/** 'YYYY-MM-DD' → KST 하루 경계의 UTC ISO 문자열 */
function kstBoundary(date: string, edge: 'start' | 'end'): string | null {
  const iso = edge === 'start' ? `${date}T00:00:00.000+09:00` : `${date}T23:59:59.999+09:00`
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
 * 기록 쿼리에 프로그램/검색어/기간/데모 필터를 적용한다.
 * 기간은 KST 기준 하루 경계로 환산해 `created_at`(UTC)에 대응시킨다.
 */
export function applyKioskFilters<T>(query: T, filters: KioskFilters): T {
  let result = query as unknown as FilterableQuery

  if (filters.programs.length === 1) {
    result = result.eq('program', filters.programs[0])
  } else if (filters.programs.length > 1) {
    result = result.in('program', filters.programs)
  }

  if (filters.mock === 'real') result = result.eq('mocked', false)
  if (filters.mock === 'mock') result = result.eq('mocked', true)

  if (filters.search) {
    const term = sanitizeSearchTerm(filters.search)
    if (term) {
      result = result.or(
        `customer_name.ilike.%${term}%,perfume_name.ilike.%${term}%,ticket.ilike.%${term}%,product_label.ilike.%${term}%`
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
