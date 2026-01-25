// 장바구니 관련 Supabase 유틸리티 함수

import { createClient } from '@supabase/supabase-js'
import type { CartItem, AddToCartRequest, UpdateCartItemRequest } from '@/types/cart'

// Service role client (서버 사이드에서만 사용)
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

// 장바구니 조회
export async function getCartItems(userId: string): Promise<CartItem[]> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching cart items:', error)
    throw error
  }

  return data || []
}

// 장바구니 개수 조회
export async function getCartCount(userId: string): Promise<number> {
  const supabase = getServiceClient()

  const { count, error } = await supabase
    .from('cart_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching cart count:', error)
    return 0
  }

  return count || 0
}

// 장바구니 추가 (단일)
export async function addToCart(
  userId: string,
  item: AddToCartRequest
): Promise<CartItem> {
  const supabase = getServiceClient()

  const cartItem = {
    user_id: userId,
    analysis_id: item.analysis_id,
    product_type: item.product_type,
    perfume_name: item.perfume_name,
    perfume_brand: item.perfume_brand || null,
    twitter_name: item.twitter_name || null,
    size: item.size,
    price: item.price,
    quantity: item.quantity || 1,
    image_url: item.image_url || null,
    analysis_data: item.analysis_data || null,
  }

  const { data, error } = await supabase
    .from('cart_items')
    .upsert(cartItem, {
      onConflict: 'user_id,analysis_id',
      ignoreDuplicates: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding to cart:', error)
    throw error
  }

  return data
}

// 장바구니 다중 추가
export async function addMultipleToCart(
  userId: string,
  items: AddToCartRequest[]
): Promise<{ added: number; duplicates: number }> {
  const supabase = getServiceClient()

  const cartItems = items.map((item) => ({
    user_id: userId,
    analysis_id: item.analysis_id,
    product_type: item.product_type,
    perfume_name: item.perfume_name,
    perfume_brand: item.perfume_brand || null,
    twitter_name: item.twitter_name || null,
    size: item.size,
    price: item.price,
    quantity: item.quantity || 1,
    image_url: item.image_url || null,
    analysis_data: item.analysis_data || null,
  }))

  // upsert로 중복 처리 (기존 항목은 수량 증가 대신 그대로 유지)
  const { data, error } = await supabase
    .from('cart_items')
    .upsert(cartItems, {
      onConflict: 'user_id,analysis_id',
      ignoreDuplicates: true, // 중복은 무시
    })
    .select()

  if (error) {
    console.error('Error adding multiple items to cart:', error)
    throw error
  }

  return {
    added: data?.length || 0,
    duplicates: items.length - (data?.length || 0),
  }
}

// 장바구니 아이템 수정
export async function updateCartItem(
  itemId: string,
  userId: string,
  updates: UpdateCartItemRequest
): Promise<CartItem> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('cart_items')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('user_id', userId) // 본인 것만 수정 가능
    .select()
    .single()

  if (error) {
    console.error('Error updating cart item:', error)
    throw error
  }

  return data
}

// 장바구니 아이템 삭제 (단일)
export async function removeFromCart(
  itemId: string,
  userId: string
): Promise<void> {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error removing from cart:', error)
    throw error
  }
}

// 장바구니 아이템 다중 삭제
export async function removeMultipleFromCart(
  itemIds: string[],
  userId: string
): Promise<number> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('cart_items')
    .delete()
    .in('id', itemIds)
    .eq('user_id', userId)
    .select()

  if (error) {
    console.error('Error removing multiple items from cart:', error)
    throw error
  }

  return data?.length || 0
}

// 장바구니 전체 삭제
export async function clearCart(userId: string): Promise<void> {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('Error clearing cart:', error)
    throw error
  }
}

// 특정 분석 결과가 장바구니에 있는지 확인
export async function isInCart(
  userId: string,
  analysisId: string
): Promise<boolean> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('cart_items')
    .select('id')
    .eq('user_id', userId)
    .eq('analysis_id', analysisId)
    .maybeSingle()

  if (error) {
    console.error('Error checking cart:', error)
    return false
  }

  return !!data
}

// 여러 분석 결과의 장바구니 상태 확인
export async function getCartStatus(
  userId: string,
  analysisIds: string[]
): Promise<Set<string>> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('cart_items')
    .select('analysis_id')
    .eq('user_id', userId)
    .in('analysis_id', analysisIds)

  if (error) {
    console.error('Error checking cart status:', error)
    return new Set()
  }

  return new Set(data?.map((item) => item.analysis_id) || [])
}
