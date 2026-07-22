'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  Cake,
  CheckCircle2,
  Clock,
  Gift,
  Loader2,
  LucideIcon,
  QrCode,
  ShoppingBag,
  Ticket,
  Users,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getCouponDiscountLabel, type CouponDiscountType } from '@/types/coupon'
import { CouponUsageModal } from './CouponUsageModal'

interface UserCoupon {
  id: string
  coupon_id: string
  is_used: boolean
  used_at: string | null
  claimed_at: string
  coupon: {
    code: string
    type: string
    discount_percent: number
    discount_type?: CouponDiscountType | string | null
    discount_amount?: number | null
    title: string
    description: string
    valid_until: string | null
  }
}

interface CouponListProps {
  viewMode: 'grid' | 'list'
}

const COUPON_TYPE_INFO: Record<string, { icon: LucideIcon; color: string; bgGradient: string }> = {
  welcome: { icon: Gift, color: 'text-[var(--muted-ink)]', bgGradient: 'from-[var(--soft)] to-[var(--canvas)]' },
  birthday: { icon: Cake, color: 'text-[var(--muted-ink)]', bgGradient: 'from-[var(--soft)] to-[var(--canvas)]' },
  referral: { icon: Users, color: 'text-[var(--muted-ink)]', bgGradient: 'from-[var(--soft)] to-[var(--canvas)]' },
  repurchase: { icon: ShoppingBag, color: 'text-[var(--muted-ink)]', bgGradient: 'from-[var(--soft)] to-[var(--canvas)]' },
  offline: { icon: Ticket, color: 'text-[var(--ink)]', bgGradient: 'from-[var(--soft)] to-[var(--paper)]' },
}

export function CouponList({ viewMode }: CouponListProps) {
  const t = useTranslations('mypage.couponList')
  const [coupons, setCoupons] = useState<UserCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'available' | 'used'>('all')
  const [selectedCoupon, setSelectedCoupon] = useState<UserCoupon | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [registerCode, setRegisterCode] = useState('')
  const [registering, setRegistering] = useState(false)
  const [registerMessage, setRegisterMessage] = useState('')
  const [registerError, setRegisterError] = useState('')

  const handleCouponClick = (userCoupon: UserCoupon) => {
    if (!userCoupon.is_used) {
      setSelectedCoupon(userCoupon)
      setIsModalOpen(true)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async (showLoading: boolean = true) => {
    if (showLoading) setLoading(true)
    try {
      const response = await fetch('/api/coupons/my')
      const data = await response.json()
      if (response.ok) {
        setCoupons(data.coupons || [])
      }
    } catch (error) {
      console.error('Failed to fetch coupons:', error)
    }
    if (showLoading) setLoading(false)
  }

  const handleRegisterCoupon = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const code = registerCode.trim()
    if (!code) {
      setRegisterError('쿠폰 코드를 입력해주세요')
      setRegisterMessage('')
      return
    }

    setRegistering(true)
    setRegisterError('')
    setRegisterMessage('')

    try {
      const response = await fetch('/api/coupons/offline/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '쿠폰 등록에 실패했습니다')
      }

      setRegisterCode('')
      setRegisterMessage(data.message || '쿠폰이 등록되었습니다')
      await fetchCoupons(false)
    } catch (error) {
      setRegisterError(error instanceof Error ? error.message : '쿠폰 등록에 실패했습니다')
    } finally {
      setRegistering(false)
    }
  }

  const filteredCoupons = coupons.filter((coupon) => {
    if (filter === 'available') return !coupon.is_used
    if (filter === 'used') return coupon.is_used
    return true
  })

  const availableCount = coupons.filter((c) => !c.is_used).length
  const usedCount = coupons.filter((c) => c.is_used).length
  const registrationForm = (
    <form
      onSubmit={handleRegisterCoupon}
      className="rounded-[6px] border-3 border-[var(--line)] bg-[var(--soft)] p-4"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--line)] bg-[var(--soft)]">
          <QrCode className="h-5 w-5 text-[var(--ink)]" />
        </div>
        <div className="min-w-0">
          <h3 className="font-black text-[var(--ink)]">오프라인 쿠폰 등록</h3>
          <p className="text-xs lg:text-sm font-bold text-[var(--muted-ink)]">종이 쿠폰의 8자리 코드를 입력하세요</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={registerCode}
          onChange={(event) => setRegisterCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
          placeholder="B7K4M2QA"
          maxLength={8}
          className="min-w-0 flex-1 rounded-[6px] border border-[var(--line)] px-3 py-3 font-mono text-sm lg:text-base font-black uppercase text-[var(--ink)] placeholder:text-[var(--muted-ink)] outline-none transition focus:border-[var(--line)]"
          disabled={registering}
        />
        <button
          type="submit"
          disabled={registering}
          className="flex min-w-20 items-center justify-center gap-1 rounded-[6px] border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm lg:text-base font-black text-[var(--ink)] transition hover:bg-[var(--soft)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
          등록
        </button>
      </div>

      {registerError && (
        <div className="mt-3 flex items-start gap-2 rounded-[6px] border-2 border-red-200 bg-red-50 px-3 py-2 text-xs lg:text-sm font-bold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{registerError}</span>
        </div>
      )}

      {registerMessage && (
        <div className="mt-3 flex items-start gap-2 rounded-[6px] border border-[var(--line)] bg-[var(--soft)] px-3 py-2 text-xs lg:text-sm font-bold text-[var(--muted-ink)]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{registerMessage}</span>
        </div>
      )}
    </form>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--muted-ink)] animate-spin" />
      </div>
    )
  }

  if (coupons.length === 0) {
    return (
      <div className="space-y-4">
        {registrationForm}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-24 h-24 bg-[var(--soft)] rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[var(--line)]">
            <Ticket className="w-12 h-12 text-[var(--muted-ink)]" />
          </div>
          <h3 className="text-xl font-black text-[var(--muted-ink)] mb-2">{t('noCoupons')}</h3>
          <p className="text-[var(--muted-ink)] font-bold">{t('noCouponsHint')}</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {registrationForm}

      {/* 필터 버튼 */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-[6px] font-bold text-sm lg:text-base transition-all border border-[var(--line)] ${
            filter === 'all'
              ? 'bg-[var(--soft)] text-[var(--ink)]'
              : 'bg-[var(--paper)] hover:bg-[var(--canvas)]'
          }`}
        >
          {t('all', { count: coupons.length })}
        </button>
        <button
          onClick={() => setFilter('available')}
          className={`px-4 py-2 rounded-[6px] font-bold text-sm lg:text-base transition-all border border-[var(--line)] ${
            filter === 'available'
              ? 'bg-[var(--soft)] text-[var(--ink)]'
              : 'bg-[var(--paper)] hover:bg-[var(--canvas)]'
          }`}
        >
          {t('available', { count: availableCount })}
        </button>
        <button
          onClick={() => setFilter('used')}
          className={`px-4 py-2 rounded-[6px] font-bold text-sm lg:text-base transition-all border border-[var(--line)] ${
            filter === 'used'
              ? 'bg-[var(--soft)] text-[var(--ink)]'
              : 'bg-[var(--paper)] hover:bg-[var(--soft)]'
          }`}
        >
          {t('used', { count: usedCount })}
        </button>
      </div>

      {/* 쿠폰 목록 */}
      <AnimatePresence mode="popLayout">
        {filteredCoupons.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-[var(--muted-ink)] font-bold">
              {filter === 'available' ? t('noAvailable') : t('noUsed')}
            </p>
          </motion.div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-4'}>
            {filteredCoupons.map((userCoupon, index) => {
              const isLegacyOfflineCoupon =
                userCoupon.coupon.code?.startsWith('OFF') ||
                (
                  userCoupon.coupon.type === 'welcome' &&
                  /^[A-Z0-9]{8}$/.test(userCoupon.coupon.code || '') &&
                  userCoupon.coupon.title !== '웰컴 쿠폰'
                )
              const couponType = isLegacyOfflineCoupon
                ? 'offline'
                : userCoupon.coupon.type
              const typeInfo = COUPON_TYPE_INFO[couponType] || COUPON_TYPE_INFO.welcome
              const Icon = typeInfo.icon
              const validUntil = userCoupon.coupon.valid_until
              const isExpired = validUntil ? new Date(validUntil) < new Date() : false
              const isUsable = !userCoupon.is_used && !isExpired

              return (
                <motion.div
                  key={userCoupon.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleCouponClick(userCoupon)}
                  className={`relative bg-[var(--soft)] rounded-[6px] border-3 border-[var(--line)] overflow-hidden ${
                    isUsable ? 'cursor-pointer transition-all' : 'opacity-60'
                  }`}
                >
                  {/* 쿠폰 헤더 */}
                  <div className={`bg-gradient-to-br ${typeInfo.bgGradient} px-4 py-3 border-b-2 border-[var(--line)]`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full bg-[var(--muted-ink)] flex items-center justify-center border border-[var(--line)]`}>
                          <Icon className="w-4 h-4 text-[var(--ink)]" />
                        </div>
                        <span className="font-black text-[var(--ink)]">{userCoupon.coupon.title}</span>
                      </div>
                      {userCoupon.is_used && (
                        <span className="px-2 py-1 bg-[var(--soft)] text-[var(--muted-ink)] text-xs lg:text-sm font-bold rounded-full border border-[var(--line)]">
                          {t('usedLabel')}
                        </span>
                      )}
                      {!userCoupon.is_used && isExpired && (
                        <span className="px-2 py-1 bg-red-100 text-red-600 text-xs lg:text-sm font-bold rounded-full border border-red-200">
                          {t('expiredLabel')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 쿠폰 바디 */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-4xl font-black text-[var(--ink)]">
                        {getCouponDiscountLabel(userCoupon.coupon)}
                      </span>
                      <span className="text-lg font-black text-[var(--muted-ink)]">{t('discountLabel')}</span>
                    </div>
                    <p className="text-sm lg:text-base text-[var(--muted-ink)] font-bold mb-3">
                      {userCoupon.coupon.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs lg:text-sm text-[var(--muted-ink)]">
                      <Clock className="w-4 h-4" />
                      <span className="font-bold">
                        {userCoupon.is_used
                          ? t('usedDate', { date: new Date(userCoupon.used_at!).toLocaleDateString('ko-KR') })
                          : validUntil
                            ? t('expiryDate', { date: new Date(validUntil).toLocaleDateString('ko-KR') })
                            : t('noExpiry')}
                      </span>
                    </div>
                  </div>

                  {/* 점선 구분선 */}
                  <div className="absolute left-0 right-0 bottom-16 flex items-center px-4">
                    <div className="w-4 h-4 bg-[var(--canvas)] rounded-full -ml-6 border-r-2 border-[var(--line)]" />
                    <div className="flex-1 border-t-2 border-dashed border-[var(--line)]" />
                    <div className="w-4 h-4 bg-[var(--canvas)] rounded-full -mr-6 border-l-2 border-[var(--line)]" />
                  </div>

                  {/* 쿠폰 코드 */}
                  <div className="px-4 pb-4 pt-2">
                    <div className="bg-[var(--soft)] rounded-[6px] px-3 py-2 text-center border border-[var(--line)]">
                      <span className="text-sm lg:text-base font-mono font-bold text-[var(--muted-ink)]">
                        {userCoupon.coupon.code}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </AnimatePresence>

      {/* 쿠폰 사용 안내 모달 */}
      <CouponUsageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        coupon={selectedCoupon?.coupon || null}
      />
    </div>
  )
}
