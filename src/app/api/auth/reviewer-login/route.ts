import { NextRequest, NextResponse } from 'next/server'
import { createKakaoSession } from '@/lib/auth-session'
import type { KakaoUser } from '@/lib/auth-session'

// KCP 심사용 테스트 계정
const REVIEWER_ID = 'a0000000-0000-0000-0000-000000000001'
const REVIEWER_EMAIL = 'reviewer@neander.co.kr'
const REVIEWER_PASSWORD = 'neander2026'

/**
 * POST /api/auth/reviewer-login
 * KCP 카드사 심사 담당자용 테스트 로그인
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // 자격 증명 검증
    if (email !== REVIEWER_EMAIL || password !== REVIEWER_PASSWORD) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // 커스텀 세션 생성 (카카오 세션과 동일한 메커니즘)
    const reviewerUser: KakaoUser = {
      id: REVIEWER_ID,
      kakao_id: 'reviewer',
      email: REVIEWER_EMAIL,
      name: 'KCP 심사담당자',
      avatar_url: null,
      provider: 'kakao', // 기존 세션 시스템 호환을 위해 kakao로 설정
      created_at: new Date().toISOString(),
    }

    await createKakaoSession(reviewerUser)

    // PG 심사 모드 쿠키 설정 (클라이언트에서 읽을 수 있도록 httpOnly: false)
    const response = NextResponse.json({ success: true })
    response.cookies.set('pg_review_mode', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7일
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Reviewer login error:', error)
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
