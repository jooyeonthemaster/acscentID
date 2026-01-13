'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingCart, Copy, Check, Gift, Cake, Users, ShoppingBag, ArrowRight, Sparkles, LucideIcon } from 'lucide-react'
import { useState } from 'react'

interface CouponUsageModalProps {
  isOpen: boolean
  onClose: () => void
  coupon: {
    code: string
    type: string
    discount_percent: number
    title: string
    description: string
  } | null
}

const USAGE_GUIDES: Record<string, { icon: LucideIcon; steps: string[]; tip: string }> = {
  welcome: {
    icon: Gift,
    steps: [
      '향수 분석을 완료하고 나만의 향수를 선택하세요',
      '결제 페이지에서 "쿠폰 적용" 버튼을 눌러주세요',
      '웰컴 쿠폰을 선택하면 15% 할인이 자동 적용됩니다',
    ],
    tip: '첫 구매 시 사용하면 더욱 특별해요!',
  },
  birthday: {
    icon: Cake,
    steps: [
      '결제 페이지에서 "쿠폰 적용" → 생일 쿠폰 선택',
      '"내 생일" 또는 "최애 생일" 중 선택해주세요',
      '증빙자료(캡쳐 이미지)를 첨부해주세요',
    ],
    tip: '📸 증빙자료: 나무위키, 위키피디아, 공식 SNS 등 생일이 표시된 화면을 캡쳐해서 첨부하면 돼요!',
  },
  referral: {
    icon: Users,
    steps: [
      '친구를 초대해서 받은 감사 쿠폰이에요',
      '결제 페이지에서 "쿠폰 적용" 버튼을 눌러주세요',
      '친구 추천 쿠폰을 선택하면 10% 할인이 적용됩니다',
    ],
    tip: '더 많은 친구를 초대하면 더 많은 쿠폰을 받을 수 있어요!',
  },
  repurchase: {
    icon: ShoppingBag,
    steps: [
      '재구매 고객님께 드리는 감사 쿠폰이에요',
      '결제 페이지에서 "쿠폰 적용" 버튼을 눌러주세요',
      '재구매 쿠폰을 선택하면 10% 할인이 적용됩니다',
    ],
    tip: '다시 찾아주셔서 정말 감사해요!',
  },
}

export function CouponUsageModal({ isOpen, onClose, coupon }: CouponUsageModalProps) {
  const [copied, setCopied] = useState(false)

  if (!coupon) return null

  const guide = USAGE_GUIDES[coupon.type] || USAGE_GUIDES.welcome
  const Icon = guide.icon

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto z-[110]"
          >
            <div className="bg-[#FFF8E7] rounded-2xl overflow-hidden border-3 border-slate-900 shadow-[6px_6px_0_#000]">
              {/* Header */}
              <div className="bg-[#F472B6] px-5 py-4 relative">
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors border-2 border-white/30"
                >
                  <X className="w-4 h-4 text-white" />
                </button>

                <div className="flex items-center gap-3 pr-10">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-3 border-slate-900 shadow-[2px_2px_0_#000]">
                    <Icon className="w-6 h-6 text-[#F472B6]" />
                  </div>
                  <div className="text-white">
                    <h2 className="text-lg font-black">{coupon.title}</h2>
                    <p className="text-sm opacity-90 font-bold">{coupon.discount_percent}% 할인</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                {/* 쿠폰 코드 */}
                <div className="bg-white rounded-xl p-4 border-2 border-slate-900 shadow-[3px_3px_0_#000]">
                  <p className="text-xs text-slate-500 font-bold mb-2">쿠폰 코드</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-mono font-black text-slate-900 tracking-wider">
                      {coupon.code}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-all border-2 border-slate-900 ${
                        copied
                          ? 'bg-green-400 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {copied ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-4 h-4" /> 복사됨
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Copy className="w-4 h-4" /> 복사
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* 사용 방법 */}
                <div>
                  <h3 className="font-black text-slate-900 mb-3 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-[#F472B6]" />
                    사용 방법
                  </h3>
                  <div className="space-y-2">
                    {guide.steps.map((step, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 bg-white rounded-lg p-3 border-2 border-slate-200"
                      >
                        <div className="w-6 h-6 bg-[#F472B6] rounded-full flex items-center justify-center flex-shrink-0 border-2 border-slate-900">
                          <span className="text-xs font-black text-white">{index + 1}</span>
                        </div>
                        <p className="text-sm text-slate-700 font-bold leading-relaxed">{step}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* 팁 */}
                <div className="bg-gradient-to-br from-[#FBCFE8] to-[#FFF8E7] rounded-xl p-3 border-2 border-[#F472B6]/30">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-5 h-5 text-[#F472B6] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700 font-bold">{guide.tip}</p>
                  </div>
                </div>

                {/* CTA 버튼 */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onClose()
                    window.location.href = '/'
                  }}
                  className="w-full py-3 bg-[#F472B6] hover:bg-[#EC4899] text-white font-black rounded-xl transition-colors border-2 border-slate-900 shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#000] flex items-center justify-center gap-2"
                >
                  향수 만들러 가기
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
