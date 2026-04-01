'use client'

import { useState, useEffect, useCallback } from 'react'
import { StampInfo } from '@/types/stamp'

export function useStamps() {
  const [stampInfo, setStampInfo] = useState<StampInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStamps = useCallback(async () => {
    try {
      const response = await fetch('/api/stamps')
      const data = await response.json()
      if (data.success) {
        setStampInfo({
          totalStamps: data.totalStamps,
          rewards: data.rewards || [],
          nextMilestone: data.nextMilestone,
        })
      }
    } catch (error) {
      console.error('Failed to fetch stamps:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStamps()
  }, [fetchStamps])

  return { stampInfo, loading, refetch: fetchStamps }
}

// Hook specifically for checkout - checks eligible discounts based on quantity
export function useStampCheckoutEligibility(quantity: number) {
  const [eligibleDiscounts, setEligibleDiscounts] = useState<
    Array<{
      milestone: number
      reward_type: string
      discount_percent: number
      label: string
      source: 'existing_coupon' | 'prospective'
      userCouponId: string | null
    }>
  >([])
  const [currentStamps, setCurrentStamps] = useState(0)
  const [loading, setLoading] = useState(false)

  const checkEligibility = useCallback(async (qty: number) => {
    if (qty < 1) return
    setLoading(true)
    try {
      const response = await fetch(`/api/stamps/checkout-eligible?quantity=${qty}`)
      const data = await response.json()
      if (data.success) {
        setEligibleDiscounts(data.eligibleDiscounts || [])
        setCurrentStamps(data.currentStamps || 0)
      }
    } catch (error) {
      console.error('Failed to check stamp eligibility:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkEligibility(quantity)
  }, [quantity, checkEligibility])

  return { eligibleDiscounts, currentStamps, loading, refetch: () => checkEligibility(quantity) }
}
