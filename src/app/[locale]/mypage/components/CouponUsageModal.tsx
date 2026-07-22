'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingCart, Copy, Check, Gift, Cake, Users, ShoppingBag, ArrowRight, Sparkles, LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { getCouponDiscountLabel, type CouponDiscountType } from '@/types/coupon'

interface CouponUsageModalProps {
  isOpen: boolean
  onClose: () => void
  coupon: {
    code: string
    type: string
    discount_percent: number
    discount_type?: CouponDiscountType | string | null
    discount_amount?: number | null
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
            <div className="bg-[var(--canvas)] rounded-[6px] overflow-hidden border-3 border-[var(--line)]">
              {/* Header */}
              <div className="bg-[var(--soft)] px-5 py-4 relative">
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors border-2 border-white/30"
                >
                  <X className="w-4 h-4 text-[var(--ink)]" />
                </button>

                <div className="flex items-center gap-3 pr-10">
                  <div className="w-12 h-12 bg-[var(--paper)] rounded-full flex items-center justify-center border-3 border-[var(--line)]">
                    <Icon className="w-6 h-6 text-[var(--muted-ink)]" />
                  </div>
                  <div className="text-[var(--ink)]">
                    <h2 className="text-lg font-black">{coupon.title}</h2>
                    <p className="text-sm lg:text-base opacity-90 font-bold">{getCouponDiscountLabel(coupon)} 할인권</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                {/* 쿠폰 코드 */}
                <div className="bg-[var(--paper)] rounded-[6px] p-4 border border-[var(--line)]">
                  <p className="text-xs lg:text-sm text-[var(--muted-ink)] font-bold mb-2">{t('couponCode')}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-mono font-black text-[var(--ink)] tracking-wider">
                      {coupon.code}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className={`px-3 py-1.5 rounded-[6px] font-bold text-sm lg:text-base transition-all border border-[var(--line)] ${
                        copied
                          ? 'bg-[var(--soft)] text-[var(--ink)]'
                          : 'bg-[var(--soft)] hover:bg-[var(--soft)] text-[var(--ink)] hover:text-[var(--ink)]'
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
                  <h3 className="font-black text-[var(--ink)] mb-3 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-[var(--muted-ink)]" />
                    {t('howToUse')}
                  </h3>
                  <div className="space-y-2">
                    {steps.map((step, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 bg-[var(--paper)] rounded-[6px] p-3 border border-[var(--line)]"
                      >
                        <div className="w-6 h-6 bg-[var(--soft)] rounded-full flex items-center justify-center flex-shrink-0 border border-[var(--line)]">
                          <span className="text-xs lg:text-sm font-black text-[var(--ink)]">{index + 1}</span>
                        </div>
                        <p className="text-sm lg:text-base text-[var(--muted-ink)] font-bold leading-relaxed">{step}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* 팁 */}
                <div className="bg-gradient-to-br from-[var(--soft)] to-[var(--canvas)] rounded-[6px] p-3 border border-[var(--line)]/30">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-5 h-5 text-[var(--muted-ink)] flex-shrink-0 mt-0.5" />
                    <p className="text-sm lg:text-base text-[var(--muted-ink)] font-bold">{tip}</p>
                  </div>
                </div>

                {/* CTA 버튼 */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onClose()
                    window.location.href = '/'
                  }}
                  className="w-full py-3 bg-[var(--soft)] hover:bg-[var(--soft)] text-[var(--ink)] font-black rounded-[6px] transition-colors border border-[var(--line)] flex items-center justify-center gap-2"
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
