import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { applyKioskFilters, parseKioskFilters, KIOSK_PROGRAMS } from '@/lib/admin/kiosk-filters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 관리자 — 키오스크 분석 통계
 * GET /api/admin/kiosk/stats?program=&search=&date_from=&date_to=&mock=
 *
 * 집계는 Node에서 한다(키오스크 한 대의 기록량이라 RPC/뷰까지 갈 규모가 아니고,
 * 목록과 같은 필터 함수를 그대로 재사용할 수 있다). 상한 5000행.
 */

const MAX_ROWS = 5000
const DAILY_DAYS = 14
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

interface StatRow {
  created_at: string
  program: string
  perfume_no: string | null
  perfume_name: string | null
  product_label: string | null
  category_en: string | null
  match_score: number | null
  printed: boolean
  mocked: boolean
  photo_source: string | null
}

/** UTC 타임스탬프 → KST 기준 'YYYY-MM-DD' */
function kstDay(iso: string): string {
  return new Date(new Date(iso).getTime() + KST_OFFSET_MS).toISOString().slice(0, 10)
}

function countBy<T extends string>(rows: StatRow[], pick: (r: StatRow) => T | null) {
  const map = new Map<T, number>()
  for (const row of rows) {
    const key = pick(row)
    if (!key) continue
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const filters = parseKioskFilters(searchParams)

    const serviceClient = createServiceRoleClient()
    let query = serviceClient
      .from('kiosk_analyses')
      .select(
        'created_at, program, perfume_no, perfume_name, product_label, category_en, match_score, printed, mocked, photo_source'
      )
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS)

    query = applyKioskFilters(query, filters)

    const { data, error } = await query
    if (error) {
      console.error('Kiosk stats fetch failed:', error)
      return NextResponse.json({ error: '통계 조회에 실패했습니다' }, { status: 500 })
    }

    const rows = (data ?? []) as StatRow[]
    // 데모 결과는 매장 실적이 아니다 — 집계에서 빼고 개수만 따로 알려준다
    const real = rows.filter((r) => !r.mocked)

    const today = kstDay(new Date().toISOString())
    const days: string[] = []
    for (let i = DAILY_DAYS - 1; i >= 0; i--) {
      days.push(new Date(Date.now() + KST_OFFSET_MS - i * 86_400_000).toISOString().slice(0, 10))
    }
    const dailyMap = new Map(days.map((d) => [d, 0]))
    for (const row of real) {
      const day = kstDay(row.created_at)
      if (dailyMap.has(day)) dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1)
    }

    const last7 = days.slice(-7)
    const scored = real.filter((r) => typeof r.match_score === 'number')

    return NextResponse.json({
      success: true,
      truncated: rows.length >= MAX_ROWS,
      summary: {
        total: real.length,
        today: real.filter((r) => kstDay(r.created_at) === today).length,
        last7Days: real.filter((r) => last7.includes(kstDay(r.created_at))).length,
        printed: real.filter((r) => r.printed).length,
        mocked: rows.length - real.length,
        avgScore: scored.length
          ? Math.round((scored.reduce((sum, r) => sum + (r.match_score ?? 0), 0) / scored.length) * 1000) / 1000
          : null,
      },
      daily: days.map((day) => ({ day, count: dailyMap.get(day) ?? 0 })),
      byProgram: KIOSK_PROGRAMS.map((program) => ({
        key: program,
        count: real.filter((r) => r.program === program).length,
      })).filter((p) => p.count > 0),
      byPerfume: countBy(real, (r) =>
        r.perfume_name ? `${r.perfume_no ? `No.${r.perfume_no} ` : ''}${r.perfume_name}` : null
      ).slice(0, 10),
      byProduct: countBy(real, (r) => r.product_label),
      byCategory: countBy(real, (r) => r.category_en).slice(0, 8),
      byPhotoSource: countBy(real, (r) => r.photo_source),
    })
  } catch (error) {
    console.error('Admin kiosk stats GET error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
