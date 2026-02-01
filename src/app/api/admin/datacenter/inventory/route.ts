import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'
import { perfumes } from '@/data/perfumes'
import { InventoryItem, InventoryAlert } from '@/lib/fragrance-usage'

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

// DB 재고 row 타입
interface InventoryRow {
  id: string
  fragrance_id: string
  fragrance_name: string
  category: string | null
  online_stock_ml: number
  offline_stock_ml: number
  min_threshold_ml: number
  updated_at: string
}

export async function GET() {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const supabase = await createServerSupabaseClientWithCookies()

    // 재고 데이터 조회
    const { data: inventoryData, error } = await supabase
      .from('fragrance_inventory')
      .select('*')
      .order('fragrance_id')

    if (error) {
      console.error('Error fetching inventory:', error)
      // 테이블이 없으면 빈 배열 반환
      if (error.code === '42P01') {
        return NextResponse.json({
          items: perfumes.map((p) => ({
            id: '',
            fragranceId: p.id,
            fragranceName: p.name,
            category: p.category,
            onlineStockMl: 0,
            offlineStockMl: 0,
            totalStockMl: 0,
            minThresholdMl: 50,
            isLowStock: true,
            updatedAt: new Date().toISOString(),
          })),
          alerts: [],
        })
      }
      return NextResponse.json(
        { error: '재고 데이터 조회 실패' },
        { status: 500 }
      )
    }

    // DB 데이터를 Map으로 변환
    const inventoryMap = new Map<string, InventoryRow>(
      (inventoryData || []).map((row: InventoryRow) => [row.fragrance_id, row])
    )

    // 모든 향료에 대해 재고 정보 구성
    const items: InventoryItem[] = perfumes.map((perfume) => {
      const inv = inventoryMap.get(perfume.id)
      const onlineStock = Number(inv?.online_stock_ml) || 0
      const offlineStock = Number(inv?.offline_stock_ml) || 0
      const totalStock = onlineStock + offlineStock
      const threshold = Number(inv?.min_threshold_ml) || 50

      return {
        id: inv?.id || '',
        fragranceId: perfume.id,
        fragranceName: perfume.name,
        category: perfume.category,
        onlineStockMl: onlineStock,
        offlineStockMl: offlineStock,
        totalStockMl: totalStock,
        minThresholdMl: threshold,
        isLowStock: totalStock < threshold,
        updatedAt: inv?.updated_at || new Date().toISOString(),
      }
    })

    // 재고 부족 경고
    const alerts: InventoryAlert[] = items
      .filter((item) => item.isLowStock)
      .map((item) => ({
        fragranceId: item.fragranceId,
        fragranceName: item.fragranceName,
        currentStock: item.totalStockMl,
        threshold: item.minThresholdMl,
      }))

    return NextResponse.json({ items, alerts })
  } catch (error) {
    console.error('Error in inventory API:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
