// 장바구니 개별 아이템 API - PATCH (수정), DELETE (삭제)

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'
import { updateCartItem, removeFromCart } from '@/lib/supabase/cart'
import type { UpdateCartItemRequest } from '@/types/cart'
import { PRODUCT_PRICING, type ProductType } from '@/types/cart'

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

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH - 장바구니 아이템 수정 (수량, 사이즈/가격)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await getUserId()

    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // 수정 가능한 필드: size, price, quantity
    const updates: UpdateCartItemRequest = {}

    // 수량 변경
    if (typeof body.quantity === 'number') {
      if (body.quantity < 1 || body.quantity > 10) {
        return NextResponse.json(
          { error: '수량은 1~10 사이여야 합니다' },
          { status: 400 }
        )
      }
      updates.quantity = body.quantity
    }

    // 사이즈 변경 (가격도 함께 변경)
    if (body.size && body.product_type) {
      const productType = body.product_type as ProductType

      // 피규어 디퓨저는 사이즈 변경 불가
      if (productType === 'figure_diffuser') {
        return NextResponse.json(
          { error: '피규어 디퓨저는 사이즈 변경이 불가합니다' },
          { status: 400 }
        )
      }

      const pricing = PRODUCT_PRICING[productType]
      const sizeOption = pricing.find((p) => p.size === body.size)

      if (!sizeOption) {
        return NextResponse.json(
          { error: '유효하지 않은 사이즈입니다' },
          { status: 400 }
        )
      }

      updates.size = body.size
      updates.price = sizeOption.price
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: '수정할 항목이 없습니다' },
        { status: 400 }
      )
    }

    const updatedItem = await updateCartItem(id, userId, updates)

    return NextResponse.json({
      success: true,
      item: updatedItem,
      message: '장바구니가 수정되었습니다',
    })
  } catch (error) {
    console.error('Cart PATCH error:', error)
    return NextResponse.json(
      { error: '수정하는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE - 장바구니 아이템 삭제
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await getUserId()

    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      )
    }

    const { id } = await params

    await removeFromCart(id, userId)

    return NextResponse.json({
      success: true,
      message: '장바구니에서 삭제되었습니다',
    })
  } catch (error) {
    console.error('Cart DELETE error:', error)
    return NextResponse.json(
      { error: '삭제하는데 실패했습니다' },
      { status: 500 }
    )
  }
}
