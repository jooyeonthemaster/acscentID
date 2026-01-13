"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'

interface ParticleExplosionProps {
  origin: { x: number; y: number }
  isActive: boolean
  onComplete?: () => void
}

// 키치 색상 팔레트
const PARTICLE_COLORS = [
  '#FBCFE8', // 핑크
  '#BAE6FD', // 하늘
  '#FEF08A', // 노랑
  '#F472B6', // 진한 핑크
  '#FBBF24', // 주황
  '#A5F3FC', // 민트
  '#C4B5FD', // 보라
  '#86EFAC', // 연두
]

const PARTICLE_COUNT = 16

// 별 모양 파티클
function StarParticle({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M12 0 L14 9 L24 9 L16 14 L19 24 L12 18 L5 24 L8 14 L0 9 L10 9 Z"
        fill={color}
        stroke="black"
        strokeWidth="1"
      />
    </svg>
  )
}

// 원형 파티클
function CircleParticle({ color, size }: { color: string; size: number }) {
  return (
    <div
      className="rounded-full border-2 border-black"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
      }}
    />
  )
}

// 하트 파티클
function HeartParticle({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={color}
        stroke="black"
        strokeWidth="1"
      />
    </svg>
  )
}

export function ParticleExplosion({ origin, isActive, onComplete }: ParticleExplosionProps) {
  // 파티클 데이터 생성 (메모이제이션)
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (360 / PARTICLE_COUNT) * i + (Math.random() - 0.5) * 20
      const distance = 100 + Math.random() * 80
      const size = 12 + Math.random() * 12
      const delay = Math.random() * 0.15
      const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length]
      const shape = ['circle', 'star', 'heart'][Math.floor(Math.random() * 3)] as 'circle' | 'star' | 'heart'
      const rotation = Math.random() * 360

      return { id: i, angle, distance, size, delay, color, shape, rotation }
    })
  }, [])

  // 축하 텍스트
  const celebrationText = useMemo(() => {
    const texts = ['GET!', 'NICE!', 'CATCH!', 'GOOD!']
    return texts[Math.floor(Math.random() * texts.length)]
  }, [])

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isActive && (
        <div
          className="fixed pointer-events-none z-50"
          style={{ left: origin.x, top: origin.y }}
        >
          {/* 중앙 플래시 */}
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white"
          />

          {/* 축하 텍스트 */}
          <motion.div
            initial={{ scale: 0, y: 0, opacity: 1 }}
            animate={{ scale: 1.2, y: -60, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
          >
            <span className="text-3xl font-black text-white drop-shadow-[2px_2px_0px_#000]">
              {celebrationText}
            </span>
          </motion.div>

          {/* 파티클들 */}
          {particles.map((p) => {
            const radians = (p.angle * Math.PI) / 180
            const targetX = Math.cos(radians) * p.distance
            const targetY = Math.sin(radians) * p.distance

            return (
              <motion.div
                key={p.id}
                initial={{
                  x: -p.size / 2,
                  y: -p.size / 2,
                  scale: 1,
                  opacity: 1,
                  rotate: 0,
                }}
                animate={{
                  x: targetX - p.size / 2,
                  y: targetY - p.size / 2,
                  scale: 0,
                  opacity: 0,
                  rotate: p.rotation,
                }}
                transition={{
                  duration: 0.7,
                  ease: "easeOut",
                  delay: p.delay,
                }}
                className="absolute"
              >
                {p.shape === 'star' && <StarParticle color={p.color} size={p.size} />}
                {p.shape === 'circle' && <CircleParticle color={p.color} size={p.size} />}
                {p.shape === 'heart' && <HeartParticle color={p.color} size={p.size} />}
              </motion.div>
            )
          })}

          {/* 링 이펙트 */}
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-4 border-[#FBBF24]"
          />

          <motion.div
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-4 border-[#F472B6]"
          />
        </div>
      )}
    </AnimatePresence>
  )
}

export default ParticleExplosion
