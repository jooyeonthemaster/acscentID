'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, Gift, Trophy, ChevronDown,
  Zap, Stamp, Info
} from 'lucide-react'

interface StampTourProps {
  totalStamps: number
  rewards: Array<{
    milestone: number
    reward_type: string
    is_claimed: boolean
  }>
  loading?: boolean
}

const MILESTONES = [
  { position: 2, label: '10% 할인', emoji: '🎫', color: 'from-amber-400 to-yellow-500', badgeBg: 'bg-amber-500' },
  { position: 4, label: '20% 할인', emoji: '🎟️', color: 'from-amber-500 to-orange-500', badgeBg: 'bg-orange-500' },
  { position: 6, label: '무료 상품', emoji: '🎁', color: 'from-orange-500 to-red-500', badgeBg: 'bg-red-500' },
]

const GUIDE_ITEMS = [
  { icon: '1️⃣', text: '상품을 구매하면 자동으로 스탬프가 적립돼요' },
  { icon: '2️⃣', text: '2회 구매 시 10% 할인 쿠폰이 발급돼요' },
  { icon: '3️⃣', text: '4회 구매 시 20%, 6회 시 무료 상품!' },
  { icon: '💡', text: '한 번에 2개 이상 구매하면 즉시 할인도 가능해요' },
]

export function StampTour({ totalStamps, rewards, loading }: StampTourProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0_0_black]">
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="w-6 h-6 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="font-bold text-slate-600">스탬프 로딩중...</span>
        </div>
      </div>
    )
  }

  const stamps = Array.from({ length: 6 }, (_, i) => i + 1)
  const progressPercent = Math.min((totalStamps / 6) * 100, 100)

  const nextMilestone = MILESTONES.find(m => totalStamps < m.position)
  const nextStampsNeeded = nextMilestone ? nextMilestone.position - totalStamps : 0

  return (
    <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_black]">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,0.2)]">
              <Stamp size={18} className="text-yellow-400" />
            </div>
            <div>
              <h3 className="font-black text-black text-sm">재구매 스탬프</h3>
              <p className="text-black/60 text-[11px] font-bold">구매할수록 더 큰 혜택!</p>
            </div>
          </div>
          <div className="bg-black px-3 py-1 rounded-full">
            <span className="font-black text-amber-400 text-sm">{totalStamps}<span className="text-white/60">/6</span></span>
          </div>
        </div>
      </div>

      {/* Stamp Grid */}
      <div className="px-4 pt-5 pb-4 bg-gradient-to-b from-amber-50/50 to-white">
        <div className="grid grid-cols-6 gap-1.5 mb-4">
          {stamps.map((num, index) => {
            const isFilled = totalStamps >= num
            const milestone = MILESTONES.find(m => m.position === num)
            const isCurrentTarget = totalStamps === num - 1

            return (
              <motion.div
                key={num}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.06, type: 'spring', stiffness: 200 }}
                className="flex flex-col items-center gap-1"
              >
                <div className="relative">
                  {isFilled ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15, delay: index * 0.05 }}
                      className={`w-11 h-11 rounded-full flex items-center justify-center border-2 border-black shadow-[2px_2px_0_0_black] ${
                        milestone ? `bg-gradient-to-br ${milestone.color}` : 'bg-gradient-to-br from-amber-400 to-yellow-500'
                      }`}
                    >
                      {milestone ? (
                        <span className="text-base">{milestone.emoji}</span>
                      ) : (
                        <Check size={18} className="text-white" strokeWidth={3} />
                      )}
                    </motion.div>
                  ) : (
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCurrentTarget
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}>
                      <span className={`font-black text-sm ${
                        isCurrentTarget ? 'text-amber-500' : 'text-slate-300'
                      }`}>
                        {num}
                      </span>
                    </div>
                  )}

                  {isCurrentTarget && !isFilled && (
                    <motion.div
                      animate={{ y: [-2, 2, -2] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute -top-3 left-1/2 -translate-x-1/2"
                    >
                      <Zap size={11} className="text-amber-500 fill-amber-500" />
                    </motion.div>
                  )}
                </div>

                {milestone && (
                  <span className={`text-[8px] font-black px-1 py-0.5 rounded-full whitespace-nowrap leading-none ${
                    isFilled
                      ? `${milestone.badgeBg} text-white`
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {milestone.label}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-full"
            />
          </div>
        </div>

        {/* Next reward info */}
        {nextMilestone ? (
          <div className="flex items-center justify-between bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-200">
            <div className="flex items-center gap-2">
              <Gift size={14} className="text-amber-600" />
              <span className="text-[11px] font-bold text-slate-700">
                다음 혜택까지 <span className="text-amber-600 font-black">{nextStampsNeeded}개</span>
              </span>
            </div>
            <span className="text-[11px] font-black text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full">
              {nextMilestone.label}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 bg-amber-100 rounded-xl px-3 py-2.5 border border-amber-300">
            <Trophy size={14} className="text-amber-700" />
            <span className="text-[11px] font-black text-amber-800">모든 혜택을 달성했어요!</span>
          </div>
        )}
      </div>

      {/* Guide Toggle */}
      <button
        onClick={() => setIsGuideOpen(!isGuideOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-200 transition-colors hover:bg-slate-100"
      >
        <div className="flex items-center gap-1.5">
          <Info size={13} className="text-slate-400" />
          <span className="text-[11px] font-bold text-slate-500">스탬프 혜택 안내</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${isGuideOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isGuideOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 bg-slate-50 space-y-2">
              {GUIDE_ITEMS.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs leading-none mt-0.5">{item.icon}</span>
                  <span className="text-[11px] text-slate-600 font-medium leading-snug">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
