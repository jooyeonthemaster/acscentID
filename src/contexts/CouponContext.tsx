"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { AvailableCoupon, CouponType } from '@/types/coupon'

interface CouponState {
  isDrawerOpen: boolean
  isToastVisible: boolean
  isToastDismissed: boolean
  availableCoupons: AvailableCoupon[]
  isLoading: boolean
  // 쿠폰 클레임 모달 상태
  isClaimModalOpen: boolean
  selectedCouponType: CouponType | null
  selectedCoupon: AvailableCoupon | null
}

interface CouponContextType extends CouponState {
  openDrawer: () => void
  closeDrawer: () => void
  showToast: () => void
  dismissToast: (neverAgain?: boolean) => void
  fetchAvailableCoupons: () => Promise<void>
  claimCoupon: (couponId: string) => Promise<{ success: boolean; error?: string; requireLogin?: boolean }>
  refreshCoupons: () => Promise<void>
  // 쿠폰 클레임 모달 관련
  openClaimModal: (couponType: CouponType, coupon?: AvailableCoupon) => void
  closeClaimModal: () => void
  claimBirthdayCoupon: (couponId: string, proofType: 'self' | 'idol', idolName?: string) => Promise<{ success: boolean; error?: string; requireLogin?: boolean }>
}

const CouponContext = createContext<CouponContextType | null>(null)

export function CouponProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CouponState>({
    isDrawerOpen: false,
    isToastVisible: false,
    isToastDismissed: false,
    availableCoupons: [],
    isLoading: false,
    isClaimModalOpen: false,
    selectedCouponType: null,
    selectedCoupon: null,
  })

  const openDrawer = useCallback(() => {
    setState((prev) => ({ ...prev, isDrawerOpen: true, isToastVisible: false }))
  }, [])

  const closeDrawer = useCallback(() => {
    setState((prev) => ({ ...prev, isDrawerOpen: false }))
  }, [])

  const showToast = useCallback(() => {
    setState((prev) => {
      if (prev.isToastDismissed) return prev
      return { ...prev, isToastVisible: true }
    })
  }, [])

  const dismissToast = useCallback((neverAgain?: boolean) => {
    setState((prev) => ({
      ...prev,
      isToastVisible: false,
      isToastDismissed: neverAgain ? true : prev.isToastDismissed,
    }))
    if (neverAgain) {
      localStorage.setItem('coupon_never_show', 'true')
    }
  }, [])

  const fetchAvailableCoupons = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const response = await fetch('/api/coupons/available')
      const data = await response.json()
      setState((prev) => ({
        ...prev,
        availableCoupons: data.coupons || [],
        isLoading: false,
      }))
    } catch (error) {
      console.error('Failed to fetch coupons:', error)
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  const claimCoupon = useCallback(async (couponId: string) => {
    try {
      const response = await fetch('/api/coupons/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponId }),
      })
      const data = await response.json()

      if (data.success) {
        // 쿠폰 목록 갱신
        setState((prev) => ({
          ...prev,
          availableCoupons: prev.availableCoupons.map((c) =>
            c.id === couponId ? { ...c, isClaimed: true } : c
          ),
        }))
      }

      return {
        success: data.success,
        error: data.error,
        requireLogin: data.requireLogin,
      }
    } catch (error) {
      console.error('Failed to claim coupon:', error)
      return { success: false, error: '네트워크 오류가 발생했습니다' }
    }
  }, [])

  const refreshCoupons = useCallback(async () => {
    await fetchAvailableCoupons()
  }, [fetchAvailableCoupons])

  // 쿠폰 클레임 모달 열기
  const openClaimModal = useCallback((couponType: CouponType, coupon?: AvailableCoupon) => {
    setState((prev) => ({
      ...prev,
      isClaimModalOpen: true,
      selectedCouponType: couponType,
      selectedCoupon: coupon || prev.availableCoupons.find(c => c.type === couponType) || null,
    }))
  }, [])

  // 쿠폰 클레임 모달 닫기
  const closeClaimModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isClaimModalOpen: false,
      selectedCouponType: null,
      selectedCoupon: null,
    }))
  }, [])

  // 생일 쿠폰 클레임 (증빙 타입 포함)
  const claimBirthdayCoupon = useCallback(async (
    couponId: string,
    proofType: 'self' | 'idol',
    idolName?: string
  ) => {
    try {
      const response = await fetch('/api/coupons/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponId,
          birthdayProofType: proofType,
          birthdayIdolName: idolName,
        }),
      })
      const data = await response.json()

      if (data.success) {
        setState((prev) => ({
          ...prev,
          availableCoupons: prev.availableCoupons.map((c) =>
            c.id === couponId ? { ...c, isClaimed: true } : c
          ),
          isClaimModalOpen: false,
          selectedCouponType: null,
          selectedCoupon: null,
        }))
      }

      return {
        success: data.success,
        error: data.error,
        requireLogin: data.requireLogin,
      }
    } catch (error) {
      console.error('Failed to claim birthday coupon:', error)
      return { success: false, error: '네트워크 오류가 발생했습니다' }
    }
  }, [])

  return (
    <CouponContext.Provider
      value={{
        ...state,
        openDrawer,
        closeDrawer,
        showToast,
        dismissToast,
        fetchAvailableCoupons,
        claimCoupon,
        refreshCoupons,
        openClaimModal,
        closeClaimModal,
        claimBirthdayCoupon,
      }}
    >
      {children}
    </CouponContext.Provider>
  )
}

export function useCoupon() {
  const context = useContext(CouponContext)
  if (!context) {
    throw new Error('useCoupon must be used within a CouponProvider')
  }
  return context
}
