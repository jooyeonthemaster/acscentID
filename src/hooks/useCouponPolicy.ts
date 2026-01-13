"use client"

import { useEffect, useCallback } from 'react'
import { useCoupon } from '@/contexts/CouponContext'

const STORAGE_KEY = 'acscent_coupon_policy'
const TOAST_DELAY_FIRST_VISIT = 3000 // 첫 방문: 3초
const TOAST_DELAY_RETURN_VISIT = 5000 // 재방문: 5초

interface CouponPolicy {
  lastVisit: number
  toastDismissCount: number
  neverShowToast: boolean
  lastToastDismiss: number | null
}

function getPolicy(): CouponPolicy {
  if (typeof window === 'undefined') {
    return {
      lastVisit: 0,
      toastDismissCount: 0,
      neverShowToast: false,
      lastToastDismiss: null,
    }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to parse coupon policy:', e)
  }

  return {
    lastVisit: 0,
    toastDismissCount: 0,
    neverShowToast: false,
    lastToastDismiss: null,
  }
}

function savePolicy(policy: CouponPolicy) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(policy))
  } catch (e) {
    console.error('Failed to save coupon policy:', e)
  }
}

export function useCouponPolicy() {
  const { showToast, dismissToast, fetchAvailableCoupons } = useCoupon()

  // 토스트 표시 여부 판단 및 타이머 설정
  const initializeCouponPolicy = useCallback(() => {
    const policy = getPolicy()
    const now = Date.now()
    const hoursSinceLastVisit = (now - policy.lastVisit) / (1000 * 60 * 60)

    // "다시 보지 않기" 선택한 경우
    if (policy.neverShowToast) {
      return
    }

    // 3회 이상 닫은 경우 토스트 미표시
    if (policy.toastDismissCount >= 3) {
      return
    }

    // 마지막 토스트 닫은 후 24시간 이내면 미표시
    if (policy.lastToastDismiss) {
      const hoursSinceDismiss = (now - policy.lastToastDismiss) / (1000 * 60 * 60)
      if (hoursSinceDismiss < 24) {
        return
      }
    }

    // 토스트 표시 딜레이 결정
    const isFirstVisit = policy.lastVisit === 0
    const delay = isFirstVisit ? TOAST_DELAY_FIRST_VISIT : TOAST_DELAY_RETURN_VISIT

    // 방문 기록 업데이트
    savePolicy({
      ...policy,
      lastVisit: now,
    })

    // 토스트 표시
    const timer = setTimeout(() => {
      showToast()
    }, delay)

    return () => clearTimeout(timer)
  }, [showToast])

  // 토스트 닫기 시 정책 업데이트
  const handleDismissToast = useCallback(
    (neverAgain?: boolean) => {
      const policy = getPolicy()

      savePolicy({
        ...policy,
        toastDismissCount: policy.toastDismissCount + 1,
        neverShowToast: neverAgain || false,
        lastToastDismiss: Date.now(),
      })

      dismissToast(neverAgain)
    },
    [dismissToast]
  )

  // 쿠폰 정책 초기화 및 쿠폰 목록 로드
  useEffect(() => {
    fetchAvailableCoupons()
    const cleanup = initializeCouponPolicy()
    return cleanup
  }, [fetchAvailableCoupons, initializeCouponPolicy])

  return {
    handleDismissToast,
  }
}
