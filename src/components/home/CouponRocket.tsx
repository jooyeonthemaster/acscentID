"use client"

import { motion } from 'framer-motion'
import { CouponType } from '@/types/coupon'

interface CouponRocketProps {
  type: CouponType
  onCatch: (e: React.MouseEvent) => void
  style?: React.CSSProperties
  className?: string
}

// 쿠폰 타입별 스타일
const COUPON_STYLES: Record<CouponType, { bg: string, label: string, discount: string }> = {
  birthday: { bg: '#FBCFE8', label: '생일 쿠폰', discount: '20%' },
  referral: { bg: '#BAE6FD', label: '친구 초대', discount: '10%' },
  repurchase: { bg: '#FEF08A', label: '재구매', discount: '10%' },
  welcome: { bg: '#BBF7D0', label: '웰컴 쿠폰', discount: '15%' },
}

// 로켓 불꽃 SVG
function RocketFlame() {
  return (
    <motion.svg
      width="35"
      height="50"
      viewBox="0 0 35 50"
      className="absolute -right-7 top-1/2 -translate-y-1/2"
      animate={{
        scaleY: [1, 1.4, 1],
        scaleX: [1, 0.9, 1],
      }}
      transition={{
        duration: 0.15,
        repeat: Infinity,
        ease: "linear"
      }}
    >
      {/* 바깥 불꽃 - 주황 */}
      <path
        d="M0 25 Q18 0 18 25 Q18 50 0 25"
        fill="#F97316"
        stroke="black"
        strokeWidth="2"
      />
      {/* 안쪽 불꽃 - 노랑 */}
      <path
        d="M3 25 Q12 10 12 25 Q12 40 3 25"
        fill="#FBBF24"
      />
      {/* 가장 안쪽 - 하양 */}
      <path
        d="M5 25 Q9 18 9 25 Q9 32 5 25"
        fill="#FEF3C7"
      />
    </motion.svg>
  )
}

// 흔들림 애니메이션 variants
const wobbleVariants = {
  wobble: {
    rotate: [-6, 6, -6],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  }
}

export function CouponRocket({ type, onCatch, style, className }: CouponRocketProps) {
  const couponStyle = COUPON_STYLES[type] || COUPON_STYLES.birthday

  return (
    <motion.div
      onClick={onCatch}
      variants={wobbleVariants}
      animate="wobble"
      whileHover={{
        scale: 1.15,
        rotate: 0,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.95 }}
      className={`cursor-grab active:cursor-grabbing select-none ${className}`}
      style={{
        ...style,
        willChange: 'transform',
      }}
    >
      <div className="relative">
        {/* 티켓 모양 로켓 바디 */}
        <svg
          width="130"
          height="75"
          viewBox="0 0 130 75"
          className="drop-shadow-[4px_4px_0px_#000] hover:drop-shadow-[2px_2px_0px_#000] transition-all"
        >
          {/* 티켓 외곽 - 양쪽에 반원 컷아웃 */}
          <path
            d="M8 5 H122 V25 C114 25 114 50 122 50 V70 H8 V50 C16 50 16 25 8 25 V5 Z"
            fill={couponStyle.bg}
            stroke="black"
            strokeWidth="3"
          />
          {/* 점선 절취선 */}
          <line
            x1="90"
            y1="10"
            x2="90"
            y2="65"
            stroke="black"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
        </svg>

        {/* 티켓 콘텐츠 */}
        <div className="absolute inset-0 flex items-center pl-5 pr-3 pointer-events-none">
          <div className="w-[60px] flex flex-col justify-center">
            <div className="text-[8px] font-black text-slate-900 tracking-widest uppercase">
              COUPON
            </div>
            <div className="text-[13px] font-black text-slate-900 leading-tight break-keep my-0.5">
              {couponStyle.label}
            </div>
            <div>
              <span className="inline-block bg-black text-white px-1.5 py-0.5 text-[7px] font-bold rounded-sm">
                잡아요!
              </span>
            </div>
          </div>

          {/* 할인율 표시 - 점선 오른쪽 영역 */}
          <div className="w-[35px] ml-auto flex justify-center items-center">
            <span className="text-lg font-black text-slate-900 -rotate-90 whitespace-nowrap">
              {couponStyle.discount}
            </span>
          </div>
        </div>

        {/* 로켓 불꽃 */}
        <RocketFlame />

        {/* 호버 시 글로우 효과 */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          style={{
            boxShadow: `0 0 20px ${couponStyle.bg}, 0 0 40px ${couponStyle.bg}`,
          }}
        />
      </div>
    </motion.div>
  )
}

export default CouponRocket
