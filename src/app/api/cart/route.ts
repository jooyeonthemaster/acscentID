// 장바구니 API - GET (조회), POST (추가), DELETE (다중 삭제)

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'
import {
  getCartItems,
  getCartCount,
  addToCart,
  addMultipleToCart,
  removeMultipleFromCart,
  clearCart,
} from '@/lib/supabase/cart'
import type { AddToCartRequest } from '@/types/cart'

// 사용자 인증 확인
async function getUserId(): Promise<string | null> {
  // 1. Kakao 커스텀 세션 확인
  const kakaoSession = await getKakaoSession()
  if (kakaoSession?.user?.id) {
    return kakaoSession.user.id
  }

  // 2. Supabase Auth 세션 확인 (Google 로그인용)
  const supabase = await createServerSupabaseClientWithCookies()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.user?.id) {
    return session.user.id
  }

  return null
}

// GET - 장바구니 조회
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()

    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      )
    }

    // count 파라미터가 있으면 개수만 반환
    const { searchParams } = new URL(request.url)
    const countOnly = searchParams.get('count') === 'true'

    if (countOnly) {
      const count = await getCartCount(userId)
      return NextResponse.json({ count })
    }

    const items = await getCartItems(userId)
    return NextResponse.json({ items, count: items.length })
  } catch (error) {
    console.error('Cart GET error:', error)
    return NextResponse.json(
      { error: '장바구니를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST - 장바구니 추가 (단일 또는 다중)
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()

    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // 다중 추가: items 배열이 있는 경우
    if (body.items && Array.isArray(body.items)) {
      const items: AddToCartRequest[] = body.items

      // 유효성 검사
      for (const item of items) {
        if (!item.analysis_id || !item.product_type || !item.perfume_name || !item.size || !item.price) {
          return NextResponse.json(
            { error: '필수 항목이 누락되었습니다 (analysis_id, product_type, perfume_name, size, price)' },
            { status: 400 }
          )
        }
      }

      const result = await addMultipleToCart(userId, items)
      return NextResponse.json({
        success: true,
        added: result.added,
        duplicates: result.duplicates,
        message: result.duplicates > 0
          ? `${result.added}개 추가됨 (${result.duplicates}개는 이미 장바구니에 있음)`
          : `${result.added}개가 장바구니에 추가되었습니다`,
      })
    }

    // 단일 추가
    const item: AddToCartRequest = body

    if (!item.analysis_id || !item.product_type || !item.perfume_name || !item.size || !item.price) {
      return NextResponse.json(
        { error: '필수 항목이 누락되었습니다' },
        { status: 400 }
      )
    }

    const cartItem = await addToCart(userId, item)
    return NextResponse.json({
      success: true,
      item: cartItem,
      message: '장바구니에 추가되었습니다',
    })
  } catch (error: unknown) {
    console.error('Cart POST error:', error)

    // 중복 에러 처리
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json(
        { error: '이미 장바구니에 있는 상품입니다' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: '장바구니에 추가하는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE - 장바구니 삭제 (다중 또는 전체)
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId()

    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const clearAll = searchParams.get('all') === 'true'

    // 전체 삭제
    if (clearAll) {
      await clearCart(userId)
      return NextResponse.json({
        success: true,
        message: '장바구니가 비워졌습니다',
      })
    }

    // 다중 삭제: body에 ids 배열
    const body = await request.json()
    const ids: string[] = body.ids

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '삭제할 항목을 선택해주세요' },
        { status: 400 }
      )
    }

    const deletedCount = await removeMultipleFromCart(ids, userId)
    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      message: `${deletedCount}개 항목이 삭제되었습니다`,
    })
  } catch (error) {
    console.error('Cart DELETE error:', error)
    return NextResponse.json(
      { error: '삭제하는데 실패했습니다' },
      { status: 500 }
    )
  }
}
