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
  welcome: { icon: Gift, color: 'text-[#F472B6]', bgGradient: 'from-[#FBCFE8] to-[#FFF8E7]' },
  birthday: { icon: Cake, color: 'text-[#F472B6]', bgGradient: 'from-[#FBCFE8] to-[#FFF8E7]' },
  referral: { icon: Users, color: 'text-[#F472B6]', bgGradient: 'from-[#FBCFE8] to-[#FFF8E7]' },
  repurchase: { icon: ShoppingBag, color: 'text-[#F472B6]', bgGradient: 'from-[#FBCFE8] to-[#FFF8E7]' },
  offline: { icon: Ticket, color: 'text-slate-950', bgGradient: 'from-yellow-200 to-white' },
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
      className="rounded-2xl border-3 border-slate-900 bg-white p-4 shadow-[4px_4px_0_#000]"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-900 bg-yellow-300">
          <QrCode className="h-5 w-5 text-slate-950" />
        </div>
        <div className="min-w-0">
          <h3 className="font-black text-slate-950">오프라인 쿠폰 등록</h3>
          <p className="text-xs font-bold text-slate-500">종이 쿠폰의 8자리 코드를 입력하세요</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={registerCode}
          onChange={(event) => setRegisterCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
          placeholder="B7K4M2QA"
          maxLength={8}
          className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-3 py-3 font-mono text-sm font-black uppercase text-slate-900 outline-none transition focus:border-slate-900"
          disabled={registering}
        />
        <button
          type="submit"
          disabled={registering}
          className="flex min-w-20 items-center justify-center gap-1 rounded-xl border-2 border-slate-900 bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
          등록
        </button>
      </div>

      {registerError && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{registerError}</span>
        </div>
      )}

      {registerMessage && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{registerMessage}</span>
        </div>
      )}
    </form>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#F472B6] animate-spin" />
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
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-slate-200">
            <Ticket className="w-12 h-12 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-700 mb-2">{t('noCoupons')}</h3>
          <p className="text-slate-500 font-bold">{t('noCouponsHint')}</p>
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
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 border-black ${
            filter === 'all'
              ? 'bg-[#F472B6] text-white shadow-[2px_2px_0_0_black]'
              : 'bg-white hover:bg-pink-50'
          }`}
        >
          {t('all', { count: coupons.length })}
        </button>
        <button
          onClick={() => setFilter('available')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 border-black ${
            filter === 'available'
              ? 'bg-[#F472B6] text-white shadow-[2px_2px_0_0_black]'
              : 'bg-white hover:bg-pink-50'
          }`}
        >
          {t('available', { count: availableCount })}
        </button>
        <button
          onClick={() => setFilter('used')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 border-black ${
            filter === 'used'
              ? 'bg-slate-400 text-white shadow-[2px_2px_0_0_black]'
              : 'bg-white hover:bg-slate-50'
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
            <p className="text-slate-500 font-bold">
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
                  className={`relative bg-white rounded-2xl border-3 border-slate-900 overflow-hidden ${
                    isUsable ? 'shadow-[4px_4px_0_#000] cursor-pointer hover:shadow-[6px_6px_0_#000] hover:-translate-y-0.5 transition-all' : 'opacity-60'
                  }`}
                >
                  {/* 쿠폰 헤더 */}
                  <div className={`bg-gradient-to-br ${typeInfo.bgGradient} px-4 py-3 border-b-2 border-slate-900`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full bg-[#F472B6] flex items-center justify-center border-2 border-slate-900`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-black text-slate-900">{userCoupon.coupon.title}</span>
                      </div>
                      {userCoupon.is_used && (
                        <span className="px-2 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-full border border-slate-300">
                          {t('usedLabel')}
                        </span>
                      )}
                      {!userCoupon.is_used && isExpired && (
                        <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full border border-red-200">
                          {t('expiredLabel')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 쿠폰 바디 */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-4xl font-black text-[#F472B6]">
                        {getCouponDiscountLabel(userCoupon.coupon)}
                      </span>
                      <span className="text-lg font-black text-slate-600">{t('discountLabel')}</span>
                    </div>
                    <p className="text-sm text-slate-600 font-bold mb-3">
                      {userCoupon.coupon.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
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
                    <div className="w-4 h-4 bg-[#FFF8E7] rounded-full -ml-6 border-r-2 border-slate-900" />
                    <div className="flex-1 border-t-2 border-dashed border-slate-300" />
                    <div className="w-4 h-4 bg-[#FFF8E7] rounded-full -mr-6 border-l-2 border-slate-900" />
                  </div>

                  {/* 쿠폰 코드 */}
                  <div className="px-4 pb-4 pt-2">
                    <div className="bg-slate-100 rounded-lg px-3 py-2 text-center border-2 border-slate-200">
                      <span className="text-sm font-mono font-bold text-slate-600">
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
