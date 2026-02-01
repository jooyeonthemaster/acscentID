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

interface RouteContext {
  params: Promise<{ fragranceId: string }>
}

// GET: 단일 향료 재고 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const { fragranceId } = await context.params
    const decodedId = decodeURIComponent(fragranceId)
    const supabase = await createServerSupabaseClientWithCookies()

    // 향료 정보 확인
    const perfume = perfumes.find((p) => p.id === decodedId)
    if (!perfume) {
      return NextResponse.json(
        { error: '향료를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 재고 데이터 조회
    const { data: inventory } = await supabase
      .from('fragrance_inventory')
      .select('*')
      .eq('fragrance_id', decodedId)
      .single()

    // 최근 변동 이력 조회
    const { data: logs } = await supabase
      .from('fragrance_inventory_logs')
      .select('*')
      .eq('fragrance_id', decodedId)
      .order('created_at', { ascending: false })
      .limit(20)

    const onlineStock = Number(inventory?.online_stock_ml) || 0
    const offlineStock = Number(inventory?.offline_stock_ml) || 0

    return NextResponse.json({
      fragranceId: perfume.id,
      fragranceName: perfume.name,
      category: perfume.category,
      onlineStockMl: onlineStock,
      offlineStockMl: offlineStock,
      totalStockMl: onlineStock + offlineStock,
      minThresholdMl: Number(inventory?.min_threshold_ml) || 50,
      updatedAt: inventory?.updated_at || null,
      logs: (logs || []).map((log) => ({
        id: log.id,
        changeType: log.change_type,
        source: log.source,
        changeAmountMl: Number(log.change_amount_ml),
        resultingStockMl: Number(log.resulting_stock_ml),
        referenceType: log.reference_type,
        referenceId: log.reference_id,
        note: log.note,
        createdAt: log.created_at,
        createdBy: log.created_by,
      })),
    })
  } catch (error) {
    console.error('Error in inventory detail API:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// PUT: 재고 직접 설정
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const { fragranceId } = await context.params
    const decodedId = decodeURIComponent(fragranceId)
    const body = await request.json()
    const { onlineStockMl, offlineStockMl, minThresholdMl, note } = body

    // 향료 정보 확인
    const perfume = perfumes.find((p) => p.id === decodedId)
    if (!perfume) {
      return NextResponse.json(
        { error: '향료를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const supabase = await createServerSupabaseClientWithCookies()

    // 기존 재고 확인
    const { data: existing } = await supabase
      .from('fragrance_inventory')
      .select('*')
      .eq('fragrance_id', decodedId)
      .single()

    const updateData: Record<string, unknown> = {
      fragrance_id: decodedId,
      fragrance_name: perfume.name,
      category: perfume.category,
      updated_by: adminCheck.email,
    }

    if (onlineStockMl !== undefined) {
      updateData.online_stock_ml = onlineStockMl
    }
    if (offlineStockMl !== undefined) {
      updateData.offline_stock_ml = offlineStockMl
    }
    if (minThresholdMl !== undefined) {
      updateData.min_threshold_ml = minThresholdMl
    }

    // upsert 수행
    const { error } = await supabase
      .from('fragrance_inventory')
      .upsert(updateData, { onConflict: 'fragrance_id' })

    if (error) {
      console.error('Error updating inventory:', error)
      return NextResponse.json(
        { error: '재고 업데이트 실패' },
        { status: 500 }
      )
    }

    // 변동 이력 기록
    const newOnline = onlineStockMl ?? Number(existing?.online_stock_ml) ?? 0
    const newOffline = offlineStockMl ?? Number(existing?.offline_stock_ml) ?? 0

    // 온라인 변동 기록
    if (onlineStockMl !== undefined) {
      await supabase.from('fragrance_inventory_logs').insert({
        fragrance_id: decodedId,
        change_type: 'adjust',
        source: 'online',
        change_amount_ml: onlineStockMl - (Number(existing?.online_stock_ml) || 0),
        resulting_stock_ml: newOnline,
        reference_type: 'manual',
        note: note || '재고 직접 설정',
        created_by: adminCheck.email,
      })
    }

    // 오프라인 변동 기록
    if (offlineStockMl !== undefined) {
      await supabase.from('fragrance_inventory_logs').insert({
        fragrance_id: decodedId,
        change_type: 'adjust',
        source: 'offline',
        change_amount_ml: offlineStockMl - (Number(existing?.offline_stock_ml) || 0),
        resulting_stock_ml: newOffline,
        reference_type: 'manual',
        note: note || '재고 직접 설정',
        created_by: adminCheck.email,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in inventory update API:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// POST: 재고 추가/차감
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const { fragranceId } = await context.params
    const decodedId = decodeURIComponent(fragranceId)
    const body = await request.json()
    const { source, changeType, amountMl, note } = body

    if (!source || !changeType || amountMl === undefined) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다' },
        { status: 400 }
      )
    }

    // 향료 정보 확인
    const perfume = perfumes.find((p) => p.id === decodedId)
    if (!perfume) {
      return NextResponse.json(
        { error: '향료를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const supabase = await createServerSupabaseClientWithCookies()

    // 기존 재고 확인
    const { data: existing } = await supabase
      .from('fragrance_inventory')
      .select('*')
      .eq('fragrance_id', decodedId)
      .single()

    const currentOnline = Number(existing?.online_stock_ml) || 0
    const currentOffline = Number(existing?.offline_stock_ml) || 0

    // 변동량 계산
    const changeAmount = changeType === 'add' ? amountMl : -amountMl

    let newOnline = currentOnline
    let newOffline = currentOffline

    if (source === 'online') {
      newOnline = Math.max(0, currentOnline + changeAmount)
    } else {
      newOffline = Math.max(0, currentOffline + changeAmount)
    }

    // 재고 업데이트
    const { error: updateError } = await supabase
      .from('fragrance_inventory')
      .upsert({
        fragrance_id: decodedId,
        fragrance_name: perfume.name,
        category: perfume.category,
        online_stock_ml: newOnline,
        offline_stock_ml: newOffline,
        min_threshold_ml: existing?.min_threshold_ml || 50,
        updated_by: adminCheck.email,
      }, { onConflict: 'fragrance_id' })

    if (updateError) {
      console.error('Error updating inventory:', updateError)
      return NextResponse.json(
        { error: '재고 업데이트 실패' },
        { status: 500 }
      )
    }

    // 변동 이력 기록
    await supabase.from('fragrance_inventory_logs').insert({
      fragrance_id: decodedId,
      change_type: changeType,
      source,
      change_amount_ml: changeAmount,
      resulting_stock_ml: source === 'online' ? newOnline : newOffline,
      reference_type: 'manual',
      note: note || `${changeType === 'add' ? '재고 추가' : '재고 차감'}`,
      created_by: adminCheck.email,
    })

    return NextResponse.json({
      success: true,
      onlineStockMl: newOnline,
      offlineStockMl: newOffline,
      totalStockMl: newOnline + newOffline,
    })
  } catch (error) {
    console.error('Error in inventory adjust API:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
