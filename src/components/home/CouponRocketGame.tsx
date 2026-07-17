"use client"

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import { useCouponRocketGame, RocketState } from '@/hooks/useCouponRocketGame'
import { useCoupon } from '@/contexts/CouponContext'
import { CouponRocket } from './CouponRocket'
import { ParticleExplosion } from './ParticleExplosion'

interface CouponRocketGameProps {
  containerRef?: React.RefObject<HTMLElement>
}

// 개별 로켓 애니메이션 컴포넌트
function FlyingRocket({
  rocket,
  onCatch,
  onMiss,
}: {
  rocket: RocketState
  onCatch: (rocketId: string, position: { x: number; y: number }) => void
  onMiss: (rocketId: string) => void
}) {
  const x = useMotionValue(rocket.flightPath.startX)
  const y = useMotionValue(rocket.flightPath.startY)

  useEffect(() => {
    const { startX, startY, endX, endY, controlPoints, duration } = rocket.flightPath

    const xKeyframes = [startX, controlPoints[0].x, controlPoints[1].x, endX]
    const yKeyframes = [startY, controlPoints[0].y, controlPoints[1].y, endY]

    const xControl = animate(x, xKeyframes, {
      duration,
      ease: "easeInOut",
      times: [0, 0.33, 0.66, 1],
      onComplete: () => onMiss(rocket.id),
    })

    const yControl = animate(y, yKeyframes, {
      duration,
      ease: "easeInOut",
      times: [0, 0.33, 0.66, 1],
    })

    return () => {
      xControl.stop()
      yControl.stop()
    }
  }, [rocket.id, rocket.flightPath, x, y, onMiss])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickPosition = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }
    onCatch(rocket.id, clickPosition)
  }, [rocket.id, onCatch])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        x,
        y,
        zIndex: 40,
        pointerEvents: 'auto',
      }}
      className="cursor-grab"
    >
      <CouponRocket
        type={rocket.coupon.type}
        onCatch={handleClick}
      />
    </motion.div>
  )
}

export function CouponRocketGame({ containerRef }: CouponRocketGameProps) {
  const [isVisible, setIsVisible] = useState(true)
  const { fetchAvailableCoupons } = useCoupon()

  const {
    rockets,
    catchPosition,
    celebratingRocketId,
    unclaimedCount,
    catchRocket,
    missRocket,
  } = useCouponRocketGame(isVisible)

  // 마운트 시 쿠폰 목록 로드
  useEffect(() => {
    fetchAvailableCoupons()
  }, [fetchAvailableCoupons])

  // IntersectionObserver로 가시성 체크
  useEffect(() => {
    const target = containerRef?.current || document.querySelector('[data-hero-section]')
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.3 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [containerRef])

  // 쿠폰이 없으면 렌더링 안함
  if (unclaimedCount === 0) return null

  const showExplosion = !!celebratingRocketId

  return (
    <>
      {/* 로켓들 */}
      <AnimatePresence>
        {rockets.map((rocket) => (
          <FlyingRocket
            key={rocket.id}
            rocket={rocket}
            onCatch={catchRocket}
            onMiss={missRocket}
          />
        ))}
      </AnimatePresence>

      {/* 파티클 폭발 */}
      {catchPosition && (
        <ParticleExplosion
          origin={catchPosition}
          isActive={showExplosion}
        />
      )}

      {/* 성공 메시지 */}
      <AnimatePresence>
        {celebratingRocketId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-[#12141D] border-4 border-[#262A38] rounded-[12px] px-8 py-6 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <div className="text-xl font-black text-[#E9E2D0] mb-1">
                쿠폰 획득!
              </div>
              <div className="text-sm lg:text-base font-bold text-[#A69F8D]">
                마이페이지에서 확인하세요
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default CouponRocketGame
