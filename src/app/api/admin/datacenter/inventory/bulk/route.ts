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

interface BulkInventoryItem {
  fragranceId: string
  onlineStockMl: number
  offlineStockMl: number
  minThresholdMl?: number
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { items } = body as { items: BulkInventoryItem[] }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: '유효한 재고 데이터가 필요합니다' },
        { status: 400 }
      )
    }

    // 향료 정보 맵 생성
    const perfumeMap = new Map(
      perfumes.map((p) => [p.id, p])
    )

    const supabase = await createServerSupabaseClientWithCookies()

    // 기존 재고 조회
    const fragranceIds = items.map((item) => item.fragranceId)
    const { data: existingInventory } = await supabase
      .from('fragrance_inventory')
      .select('*')
      .in('fragrance_id', fragranceIds)

    const existingMap = new Map(
      (existingInventory || []).map((inv) => [inv.fragrance_id, inv])
    )

    // 업데이트할 데이터 준비
    const upsertData = items
      .filter((item) => perfumeMap.has(item.fragranceId))
      .map((item) => {
        const perfume = perfumeMap.get(item.fragranceId)!
        return {
          fragrance_id: item.fragranceId,
          fragrance_name: perfume.name,
          category: perfume.category,
          online_stock_ml: item.onlineStockMl,
          offline_stock_ml: item.offlineStockMl,
          min_threshold_ml: item.minThresholdMl ?? 50,
          updated_by: adminCheck.email,
        }
      })

    // 일괄 upsert
    const { error: upsertError } = await supabase
      .from('fragrance_inventory')
      .upsert(upsertData, { onConflict: 'fragrance_id' })

    if (upsertError) {
      console.error('Error bulk updating inventory:', upsertError)
      return NextResponse.json(
        { error: '재고 일괄 업데이트 실패' },
        { status: 500 }
      )
    }

    // 변동 이력 기록
    const logEntries: {
      fragrance_id: string
      change_type: string
      source: 'online' | 'offline'
      change_amount_ml: number
      resulting_stock_ml: number
      reference_type: string
      note: string
      created_by: string | null
    }[] = []

    for (const item of items) {
      if (!perfumeMap.has(item.fragranceId)) continue

      const existing = existingMap.get(item.fragranceId)
      const prevOnline = Number(existing?.online_stock_ml) || 0
      const prevOffline = Number(existing?.offline_stock_ml) || 0

      // 온라인 변동
      if (item.onlineStockMl !== prevOnline) {
        logEntries.push({
          fragrance_id: item.fragranceId,
          change_type: 'adjust',
          source: 'online',
          change_amount_ml: item.onlineStockMl - prevOnline,
          resulting_stock_ml: item.onlineStockMl,
          reference_type: 'manual',
          note: '일괄 재고 설정',
          created_by: adminCheck.email,
        })
      }

      // 오프라인 변동
      if (item.offlineStockMl !== prevOffline) {
        logEntries.push({
          fragrance_id: item.fragranceId,
          change_type: 'adjust',
          source: 'offline',
          change_amount_ml: item.offlineStockMl - prevOffline,
          resulting_stock_ml: item.offlineStockMl,
          reference_type: 'manual',
          note: '일괄 재고 설정',
          created_by: adminCheck.email,
        })
      }
    }

    // 이력 기록 (변동이 있는 경우만)
    if (logEntries.length > 0) {
      await supabase.from('fragrance_inventory_logs').insert(logEntries)
    }

    return NextResponse.json({
      success: true,
      updated: upsertData.length,
      logsCreated: logEntries.length,
    })
  } catch (error) {
    console.error('Error in bulk inventory API:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
