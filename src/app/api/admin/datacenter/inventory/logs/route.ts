import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'
import { perfumes } from '@/data/perfumes'

// 관리자 이메일 목록
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())

// 관리자 인증 확인
async function isAdmin(): Promise<{ isAdmin: boolean; email: string | null }> {
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(kakaoSession.user.email.toLowerCase()),
      email: kakaoSession.user.email,
    }
  }

  const supabase = await createServerSupabaseClientWithCookies()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(user.email.toLowerCase()),
      email: user.email,
    }
  }

  return { isAdmin: false, email: null }
}

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const fragranceId = searchParams.get('fragranceId')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const supabase = await createServerSupabaseClientWithCookies()

    // 향료 이름 맵 생성
    const fragranceNameMap = new Map(
      perfumes.map((p) => [p.id, p.name])
    )

    // 이력 조회 쿼리 빌드
    let query = supabase
      .from('fragrance_inventory_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fragranceId) {
      query = query.eq('fragrance_id', fragranceId)
    }

    const { data: logs, error, count } = await query

    if (error) {
      console.error('Error fetching inventory logs:', error)
      // 테이블이 없으면 빈 배열 반환
      if (error.code === '42P01') {
        return NextResponse.json({ logs: [], total: 0 })
      }
      return NextResponse.json(
        { error: '이력 데이터 조회 실패' },
        { status: 500 }
      )
    }

    const formattedLogs = (logs || []).map((log) => ({
      id: log.id,
      fragranceId: log.fragrance_id,
      fragranceName: fragranceNameMap.get(log.fragrance_id) || log.fragrance_id,
      changeType: log.change_type,
      source: log.source,
      changeAmountMl: Number(log.change_amount_ml),
      resultingStockMl: Number(log.resulting_stock_ml),
      referenceType: log.reference_type,
      referenceId: log.reference_id,
      note: log.note,
      createdAt: log.created_at,
      createdBy: log.created_by,
    }))

    return NextResponse.json({
      logs: formattedLogs,
      total: count || 0,
    })
  } catch (error) {
    console.error('Error in inventory logs API:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
