import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

/**
 * 쿠폰 받기
 * POST /api/coupons/claim
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 사용자 인증 확인 (필수)
    let userId: string | null = null
    const kakaoSession = await getKakaoSession()

    if (kakaoSession?.user) {
      userId = kakaoSession.user.id
    } else {
      const supabase = await createServerSupabaseClientWithCookies()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다', requireLogin: true },
        { status: 401 }
      )
    }

    // 2. 요청 데이터 파싱
    const body = await request.json()
    const { couponId, birthdayProofType, birthdayIdolName } = body

    if (!couponId) {
      return NextResponse.json(
        { success: false, error: '쿠폰 ID가 필요합니다' },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()

    // 3. 쿠폰 존재 및 유효성 확인
    const { data: coupon, error: couponError } = await serviceClient
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .eq('is_active', true)
      .single()

    if (couponError || !coupon) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 쿠폰입니다' },
        { status: 404 }
      )
    }

    // 4. 유효기간 확인
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return NextResponse.json(
        { success: false, error: '쿠폰 유효기간이 만료되었습니다' },
        { status: 400 }
      )
    }

    // 5. 이미 받은 쿠폰인지 확인
    const { data: existingCoupon } = await serviceClient
      .from('user_coupons')
      .select('id')
      .eq('user_id', userId)
      .eq('coupon_id', couponId)
      .single()

    if (existingCoupon) {
      return NextResponse.json(
        { success: false, error: '이미 받은 쿠폰입니다' },
        { status: 409 }
      )
    }

    // 6. 쿠폰 발급 데이터 준비
    const insertData: Record<string, unknown> = {
      user_id: userId,
      coupon_id: couponId,
      claimed_at: new Date().toISOString(),
      is_used: false,
    }

    // 생일 쿠폰인 경우 추가 정보 저장
    if (coupon.type === 'birthday' && birthdayProofType) {
      insertData.birthday_proof_type = birthdayProofType
      if (birthdayIdolName) {
        insertData.birthday_idol_name = birthdayIdolName
      }
    }

    // 7. 쿠폰 발급
    const { data: userCoupon, error: insertError } = await serviceClient
      .from('user_coupons')
      .insert(insertData)
      .select(`
        *,
        coupon:coupons(*)
      `)
      .single()

    if (insertError) {
      console.error('Coupon claim failed:', insertError)
      return NextResponse.json(
        { success: false, error: '쿠폰 발급에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      userCoupon,
      message: `${coupon.title} 쿠폰이 발급되었습니다!`,
    })
  } catch (error) {
    console.error('Coupon claim API error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
