'use client'

import { useState, useEffect } from 'react'
import type { ActiveFreeShippingPromotion, ShippingFeeResult } from '@/types/promotion'
import { DEFAULT_SHIPPING_FEE, FREE_SHIPPING_THRESHOLD } from '@/types/cart'

/**
 * 현재 활성화된 배송비 무료 프로모션을 조회하는 훅
 */
export function useActivePromotions() {
  const [freeShippingPromo, setFreeShippingPromo] = useState<ActiveFreeShippingPromotion | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const res = await fetch('/api/promotions/active')
        const { promotions } = await res.json()

        // free_shipping 타입 프로모션 찾기 (가장 최근 것 우선)
        const freeShipping = promotions?.find((p: any) => p.type === 'free_shipping')
        if (freeShipping) {
          setFreeShippingPromo({
            id: freeShipping.id,
            name: freeShipping.name,
            min_order_amount: freeShipping.min_order_amount,
          })
        } else {
          setFreeShippingPromo(null)
        }
      } catch (error) {
        console.error('[useActivePromotions] Error:', error)
        setFreeShippingPromo(null)
      } finally {
        setLoading(false)
      }
    }

    fetchPromotions()
  }, [])

  return { freeShippingPromo, loading }
}

/**
 * 배송비 계산 함수 (프로모션 적용 포함)
 *
 * @param subtotal 상품 소계
 * @param productType 상품 타입 (payment_test는 항상 무료)
 * @param freeShippingPromo 활성 배송비 무료 프로모션 (없으면 null)
 */
export function calculateShippingWithPromotion(
  subtotal: number,
  productType: string | undefined,
  freeShippingPromo: ActiveFreeShippingPromotion | null
): ShippingFeeResult {
  // 테스트 상품은 항상 배송비 0
  if (productType === 'payment_test') {
    return { originalFee: 0, finalFee: 0, isFreeByPromotion: false, promotionName: null }
  }

  // 기본 배송비 규칙: 5만원 이상 무료
  const originalFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE

  // 이미 무료배송이면 프로모션 불필요
  if (originalFee === 0) {
    return { originalFee: 0, finalFee: 0, isFreeByPromotion: false, promotionName: null }
  }

  // 프로모션 적용 확인
  if (freeShippingPromo) {
    // min_order_amount가 null이면 무조건 무료
    if (freeShippingPromo.min_order_amount === null) {
      return {
        originalFee,
        finalFee: 0,
        isFreeByPromotion: true,
        promotionName: freeShippingPromo.name,
      }
    }

    // min_order_amount 이상이면 무료
    if (subtotal >= freeShippingPromo.min_order_amount) {
      return {
        originalFee,
        finalFee: 0,
        isFreeByPromotion: true,
        promotionName: freeShippingPromo.name,
      }
    }
  }

  // 프로모션 미적용
  return { originalFee, finalFee: originalFee, isFreeByPromotion: false, promotionName: null }
}
