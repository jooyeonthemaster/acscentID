"use client"

import { CouponToast } from './CouponToast'
import { CouponClaimModal } from './CouponClaimModal'

/**
 * 쿠폰 시스템 통합 컴포넌트
 * - 스마트 토스트 (첫 방문 시 자동 표시)
 * - 로켓 미니게임으로 쿠폰 획득 (KitschHero에서 렌더링)
 * - 쿠폰 클레임 모달 (로켓 클릭 시 표시)
 */
export function CouponSystem() {
  return (
    <>
      <CouponToast />
      <CouponClaimModal />
    </>
  )
}
