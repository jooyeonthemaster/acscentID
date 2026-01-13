"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCoupon } from '@/contexts/CouponContext'
import { CouponType, AvailableCoupon } from '@/types/coupon'

// 비행 경로 타입
export interface FlightPath {
  startX: number
  startY: number
  endX: number
  endY: number
  controlPoints: { x: number; y: number }[]
  duration: number
}

// 개별 로켓 상태
export interface RocketState {
  id: string
  coupon: AvailableCoupon
  flightPath: FlightPath
  status: 'flying' | 'caught' | 'missed'
}

interface RocketGameState {
  rockets: RocketState[]
  catchPosition: { x: number; y: number } | null
  celebratingRocketId: string | null
}

// 쿠폰 타입 로테이션 순서 (welcome 포함)
const COUPON_TYPE_ORDER: CouponType[] = ['birthday', 'referral', 'repurchase', 'welcome']

// 동시에 날아다니는 로켓 수
const MAX_ROCKETS = 3

// 랜덤 비행 경로 생성
function generateFlightPath(): FlightPath {
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight * 0.7 : 600

  // 모바일 여부 확인
  const isMobile = viewportWidth < 768

  // 헤더 높이 (고정 탭 아래로만 비행)
  const headerOffset = 120

  // 시작점: 왼쪽 또는 오른쪽 가장자리
  const startFromLeft = Math.random() > 0.5
  const startX = startFromLeft ? -150 : viewportWidth + 150
  const startY = headerOffset + Math.random() * (viewportHeight - headerOffset)

  // 종료점: 반대편 가장자리
  const endX = startFromLeft ? viewportWidth + 150 : -150
  const endY = headerOffset + Math.random() * (viewportHeight - headerOffset)

  // 베지어 곡선 컨트롤 포인트 (자연스러운 아치형, 헤더 아래)
  const controlPoints = [
    {
      x: viewportWidth * (0.2 + Math.random() * 0.2),
      y: headerOffset + Math.random() * (viewportHeight * 0.4)
    },
    {
      x: viewportWidth * (0.6 + Math.random() * 0.2),
      y: headerOffset + Math.random() * (viewportHeight * 0.4)
    }
  ]

  // 모바일에서는 더 느리게 (잡기 쉽게)
  const duration = isMobile ? 15 : 12

  return { startX, startY, endX, endY, controlPoints, duration }
}

export function useCouponRocketGame(isVisible: boolean = true) {
  const { availableCoupons, openClaimModal } = useCoupon()

  const [state, setState] = useState<RocketGameState>({
    rockets: [],
    catchPosition: null,
    celebratingRocketId: null,
  })

  // 미획득 쿠폰 필터링
  const unclaimedCoupons = useMemo(() =>
    availableCoupons.filter(c => !c.isClaimed),
    [availableCoupons]
  )

  // 새 로켓 추가
  const addRocket = useCallback(() => {
    if (unclaimedCoupons.length === 0) return

    // 현재 날고 있는 로켓의 쿠폰 타입들
    const flyingTypes = state.rockets
      .filter(r => r.status === 'flying')
      .map(r => r.coupon.type)

    // 미획득 쿠폰 중에서 아직 날고 있지 않은 타입 찾기
    const unclaimedTypes = unclaimedCoupons.map(c => c.type)
    const availableType = COUPON_TYPE_ORDER.find(type =>
      unclaimedTypes.includes(type) && !flyingTypes.includes(type)
    )
    if (!availableType) return

    // 해당 타입의 쿠폰 찾기
    const coupon = unclaimedCoupons.find(c => c.type === availableType)
    if (!coupon) return

    const newRocket: RocketState = {
      id: `rocket-${Date.now()}-${Math.random()}`,
      coupon,
      flightPath: generateFlightPath(),
      status: 'flying',
    }

    setState(prev => ({
      ...prev,
      rockets: [...prev.rockets.filter(r => r.status === 'flying'), newRocket],
    }))
  }, [unclaimedCoupons, state.rockets])

  // 로켓 잡기
  const catchRocket = useCallback((rocketId: string, clickPosition: { x: number; y: number }) => {
    const rocket = state.rockets.find(r => r.id === rocketId && r.status === 'flying')
    if (!rocket) return

    // 로켓 상태를 caught로 변경
    setState(prev => ({
      ...prev,
      rockets: prev.rockets.map(r =>
        r.id === rocketId ? { ...r, status: 'caught' as const } : r
      ),
      catchPosition: clickPosition,
      celebratingRocketId: rocketId,
    }))

    // 햅틱 피드백
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50)
    }

    // 모달 열기 (쿠폰 타입과 쿠폰 정보 전달)
    openClaimModal(rocket.coupon.type, rocket.coupon)

    // 1.5초 후 축하 상태 해제 (파티클 효과 유지)
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        celebratingRocketId: null,
        catchPosition: null,
      }))
    }, 1500)
  }, [state.rockets, openClaimModal])

  // 로켓 놓침
  const missRocket = useCallback((rocketId: string) => {
    setState(prev => ({
      ...prev,
      rockets: prev.rockets.filter(r => r.id !== rocketId),
    }))
  }, [])

  // 초기 로켓 3개 발사 + 주기적으로 보충
  useEffect(() => {
    if (!isVisible || unclaimedCoupons.length === 0) return

    const flyingCount = state.rockets.filter(r => r.status === 'flying').length

    if (flyingCount < MAX_ROCKETS) {
      // 0.5~2초 랜덤 딜레이로 하나씩 추가
      const delay = 500 + Math.random() * 1500
      const timer = setTimeout(addRocket, delay)
      return () => clearTimeout(timer)
    }
  }, [isVisible, unclaimedCoupons.length, state.rockets, addRocket])

  return {
    rockets: state.rockets.filter(r => r.status === 'flying'),
    catchPosition: state.catchPosition,
    celebratingRocketId: state.celebratingRocketId,
    unclaimedCount: unclaimedCoupons.length,
    catchRocket,
    missRocket,
  }
}

export default useCouponRocketGame
