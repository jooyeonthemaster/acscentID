"use client"

import { usePathname } from 'next/navigation'
import { CouponToast } from './CouponToast'
import { CouponClaimModal } from './CouponClaimModal'

// 쿠폰 시스템을 숨길 경로들
const HIDDEN_PATHS = ['/input', '/qr/input', '/result']

/**
 * 쿠폰 시스템 통합 컴포넌트
 * - 스마트 토스트 (첫 방문 시 자동 표시)
 * - 로켓 미니게임으로 쿠폰 획득 (KitschHero에서 렌더링)
 * - 쿠폰 클레임 모달 (로켓 클릭 시 표시)
 */
export function CouponSystem() {
  const pathname = usePathname()

  // input, result 등 집중이 필요한 페이지에서는 쿠폰 시스템 숨김
  const shouldHide = HIDDEN_PATHS.some(path => pathname?.startsWith(path))

  if (shouldHide) {
    return null
  }

  return (
    <>
      <CouponToast />
      <CouponClaimModal />
    </>
  )
}
