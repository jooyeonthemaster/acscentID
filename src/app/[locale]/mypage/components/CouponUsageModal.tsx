'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingCart, Copy, Check, Gift, Cake, Users, ShoppingBag, ArrowRight, Sparkles, LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
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

const COUPON_ICONS: Record<string, LucideIcon> = {
  welcome: Gift,
  birthday: Cake,
  referral: Users,
  repurchase: ShoppingBag,
}

const USAGE_GUIDE_KEYS: Record<string, { stepKeys: string[]; tipKey: string }> = {
  welcome: {
    stepKeys: ['welcomeStep1', 'welcomeStep2', 'welcomeStep3'],
    tipKey: 'welcomeTip',
  },
  birthday: {
    stepKeys: ['birthdayStep1', 'birthdayStep2', 'birthdayStep3'],
    tipKey: 'birthdayTip',
  },
  referral: {
    stepKeys: ['referralStep1', 'referralStep2', 'referralStep3'],
    tipKey: 'referralTip',
  },
  repurchase: {
    stepKeys: ['repurchaseStep1', 'repurchaseStep2', 'repurchaseStep3'],
    tipKey: 'repurchaseTip',
  },
}

export function CouponUsageModal({ isOpen, onClose, coupon }: CouponUsageModalProps) {
  const t = useTranslations('mypage.couponUsage')
  const tButtons = useTranslations('buttons')
  const [copied, setCopied] = useState(false)

  if (!coupon) return null

  const guideKeys = USAGE_GUIDE_KEYS[coupon.type] || USAGE_GUIDE_KEYS.welcome
  const Icon = COUPON_ICONS[coupon.type] || COUPON_ICONS.welcome
  const steps = guideKeys.stepKeys.map(key => t(key))
  const tip = t(guideKeys.tipKey)

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
                    <p className="text-sm opacity-90 font-bold">{coupon.discount_percent}{t('discountSuffix')}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                {/* 쿠폰 코드 */}
                <div className="bg-white rounded-xl p-4 border-2 border-slate-900 shadow-[3px_3px_0_#000]">
                  <p className="text-xs text-slate-500 font-bold mb-2">{t('couponCode')}</p>
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
                          <Check className="w-4 h-4" /> {t('copied')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Copy className="w-4 h-4" /> {t('copy')}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* 사용 방법 */}
                <div>
                  <h3 className="font-black text-slate-900 mb-3 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-[#F472B6]" />
                    {t('howToUse')}
                  </h3>
                  <div className="space-y-2">
                    {steps.map((step, index) => (
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
                    <p className="text-sm text-slate-700 font-bold">{tip}</p>
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
                  {t('goMakePerfume')}
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
