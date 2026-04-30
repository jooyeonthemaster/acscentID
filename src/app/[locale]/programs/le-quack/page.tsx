"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Star, X, AlertTriangle,
  Gift, ChevronRight, ShoppingCart,
  Sparkles, Heart, Package
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { AuthModal } from "@/components/auth/AuthModal"
import { ReviewModal, ReviewTrigger, ReviewWriteModal, ReviewStats, ReviewList } from "@/components/review"
import { getReviewStats } from "@/lib/supabase/reviews"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"
import { useProductImages } from '@/hooks/useAdminContent'
import { useProductDetail } from '@/hooks/useProductDetail'
import { InactiveProductGuard } from '@/components/programs/InactiveProductGuard'
import { CustomDetailRenderer } from '@/components/programs/CustomDetailRenderer'
import { useProductPricing } from "@/hooks/useProductPricing"
import { formatPrice } from "@/types/cart"

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
}

export default function LeQuackPage() {
  const { getOption } = useProductPricing()
  const sigOpt = getOption('signature', '10ml')
  const sigDiscount = (sigOpt?.price && sigOpt.original_price && sigOpt.original_price > sigOpt.price)
    ? Math.round(((sigOpt.original_price - sigOpt.price) / sigOpt.original_price) * 100)
    : null

  const router = useRouter()
  const { user, unifiedUser, loading } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)

  // 리뷰 관련 상태
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showReviewWriteModal, setShowReviewWriteModal] = useState(false)
  const [reviewStats, setReviewStats] = useState<ReviewStatsType | null>(null)
  const [reviewRatingFilter, setReviewRatingFilter] = useState<number | null>(null)

  const isLoggedIn = !!(user || unifiedUser)
  const currentUserId = user?.id || unifiedUser?.id

  // 리뷰 통계 로드
  useEffect(() => {
    const loadReviewStats = async () => {
      try {
        const stats = await getReviewStats('le-quack')
        setReviewStats(stats)
      } catch (error) {
        console.error('Failed to load review stats:', error)
      }
    }
    loadReviewStats()
  }, [])

  const { imageUrls: dynamicImages } = useProductImages('le-quack')
  const productImages = dynamicImages.length > 0 ? dynamicImages : [
    "/images/perfume/LE QUACK.avif",
  ]

  const { isCustomMode, detail } = useProductDetail('le-quack')

  // 바로 구매하기 - 주문 폼으로 이동
  const handlePurchaseClick = () => {
    if (loading) return
    if (isLoggedIn) {
      // 로그인 상태면 바로 주문 폼으로 이동
      router.push("/checkout?product=le-quack&type=signature")
    } else {
      setShowLoginPrompt(true)
    }
  }

  const handleGuestPurchase = () => {
    // 비회원도 구매 가능
    router.push("/checkout?product=le-quack&type=signature&guest=true")
  }

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  return (
    <InactiveProductGuard productSlug="le-quack">
    <main className="relative min-h-screen bg-[#FFFDF5] font-sans">
      <Header />

      {/* ============================================
          HERO SECTION - 제품 갤러리 + 정보
      ============================================ */}
      <section className="pt-28 pb-10 px-4">
        <div className="w-full">
          {/* 이미지 갤러리 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5"
          >
            {/* 메인 이미지 */}
            <div className="relative bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_black] mb-3">
              <div className="absolute top-3 left-3 z-10 flex gap-2">
                <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full border-2 border-black">
                  SIGNATURE
                </span>
              </div>
              <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-50">
                <motion.img
                  key={selectedImage}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  src={productImages[selectedImage]}
                  alt="SIGNATURE 뿌덕퍼퓸"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* 썸네일 */}
            {productImages.length > 1 && (
              <div className="flex gap-2 justify-center">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-14 h-14 rounded-lg border-2 overflow-hidden transition-all ${selectedImage === idx
                      ? 'border-black shadow-[2px_2px_0_0_black] scale-105'
                      : 'border-slate-300 hover:border-slate-500'
                      }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain bg-white p-1" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* 제품 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* 브레드크럼 */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
              <Link href="/" className="hover:text-black">홈</Link>
              <ChevronRight size={12} />
              <Link href="/" className="hover:text-black">시그니처</Link>
              <ChevronRight size={12} />
              <span className="text-black font-bold">시그니처 뿌덕퍼퓸</span>
            </div>

            {/* 타이틀 */}
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <ReviewTrigger
                  averageRating={reviewStats?.average_rating || 4.9}
                  totalCount={reviewStats?.total_count || 0}
                  onClick={() => setShowReviewModal(true)}
                />
                <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full">
                  SIGNATURE
                </span>
              </div>
              <h1 className="text-xl font-black text-black leading-tight mb-1.5 break-keep">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500">
                  시그니처 뿌덕퍼퓸
                </span>
              </h1>
              <p className="text-sm text-slate-600 font-medium">
                AC&apos;SCENT 시그니처 퍼퓸 + 귀여운 오리 퍼퓸키링
              </p>
            </div>

            {/* 시그니처 배너 */}
            <div className="bg-amber-500 border-2 border-black rounded-xl p-3 mb-3 shadow-[3px_3px_0_0_black]">
              <div className="flex items-center justify-center gap-2 text-white">
                <span className="text-lg">🦆</span>
                <span className="font-black text-sm">AC&apos;SCENT 시그니처 퍼퓸</span>
                <span className="text-lg">✨</span>
              </div>
            </div>

            {/* 가격 + 구성품 안내 */}
            <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0_0_black] mb-4">
              {/* 가격 */}
              <div className="flex items-end gap-2 mb-3">
                <span className="text-xl font-black text-black">{formatPrice(sigOpt?.price ?? 34000)}원</span>
                {sigOpt?.original_price && sigOpt.original_price > sigOpt.price && (
                  <>
                    <span className="text-xs text-slate-400 line-through">{formatPrice(sigOpt.original_price)}원</span>
                    {sigDiscount !== null && (
                      <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded">{sigDiscount}% OFF</span>
                    )}
                  </>
                )}
              </div>

              {/* 구성품 안내 */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span className="font-bold text-xs text-black">뿌덕퍼퓸(10ml) + 뿌덕 퍼퓸 키링</span>
                </div>
                <ul className="space-y-0.5 text-[11px] text-slate-600 pl-5">
                  <li className="list-disc">주문 후 2~3일 내 배송</li>
                  <li className="list-disc">귀여운 오리 퍼퓸키링 포함</li>
                  <li className="list-disc">프리미엄 패키지</li>
                  <li className="list-disc">5만원 이상 무료배송</li>
                </ul>
              </div>
            </div>

            {/* CTA 버튼 - 바로 구매하기 */}
            <button
              onClick={handlePurchaseClick}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-black text-base rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_black] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShoppingCart size={20} />
              지금 바로 구매하기
            </button>

            <p className="text-center text-xs text-amber-600 font-bold mt-2">
              🦆 AC&apos;SCENT 시그니처 퍼퓸 + 귀여운 오리 퍼퓸키링!
            </p>
          </motion.div>
        </div>
      </section>

      {isCustomMode ? (
        <CustomDetailRenderer html={detail?.custom_html ?? ''} />
      ) : (
        <>
          {/* ============================================
              Feature Bar - 검은 배경
          ============================================ */}
          <section className="py-6 px-4 bg-black">
            <div className="w-full">
              <div className="flex flex-wrap items-center justify-center gap-4 text-white">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🦆</span>
                  <span className="font-bold text-xs">퍼퓸키링</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400" />
                  <span className="font-bold text-xs">시그니처 향</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Package size={14} className="text-amber-400" />
                  <span className="font-bold text-xs">빠른 배송</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Heart size={14} className="text-amber-400" />
                  <span className="font-bold text-xs">선물 추천</span>
                </div>
              </div>
            </div>
          </section>

          {/* ============================================
              제품 특징
          ============================================ */}
          <section className="py-12 px-4 bg-[#FFFDF5]">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="w-full"
            >
              <div className="text-center mb-8">
                <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-amber-400 text-white text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] mb-3">
                  ✨ FEATURES
                </motion.div>
                <motion.h2 variants={fadeInUp} className="text-2xl font-black text-black break-keep">
                  시그니처 뿌덕퍼퓸의
                  <br />
                  특별함
                </motion.h2>
              </div>

              <div className="space-y-4">
                {/* 퍼퓸키링 */}
                <motion.div variants={fadeInUp} className="bg-white rounded-2xl p-5 border-2 border-black shadow-[4px_4px_0_0_black]">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">🦆</div>
                    <div>
                      <h3 className="font-black text-slate-900 mb-2">귀여운 오리 퍼퓸키링</h3>
                      <p className="text-slate-600 text-sm">AC&apos;SCENT의 마스코트 뿌덕이가 키링으로!<br />가방이나 열쇠에 달아 어디서든 귀여움을 뽐내세요</p>
                    </div>
                  </div>
                </motion.div>

                {/* 시그니처 향 */}
                <motion.div variants={fadeInUp} className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 border-2 border-black shadow-[4px_4px_0_0_black]">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">✨</div>
                    <div>
                      <h3 className="font-black text-slate-900 mb-2">AC&apos;SCENT 시그니처 향</h3>
                      <p className="text-slate-600 text-sm">브랜드를 대표하는 시그니처 향으로,<br />따뜻하고 편안한 느낌을 선사합니다</p>
                    </div>
                  </div>
                </motion.div>

                {/* 선물용 */}
                <motion.div variants={fadeInUp} className="bg-white rounded-2xl p-5 border-2 border-black shadow-[4px_4px_0_0_black]">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">🎁</div>
                    <div>
                      <h3 className="font-black text-slate-900 mb-2">선물하기 좋은 구성</h3>
                      <p className="text-slate-600 text-sm">퍼퓸과 키링이 함께 들어있어 소중한<br />사람에게 선물하기 딱 좋아요</p>
                    </div>
                  </div>
                </motion.div>

              </div>
            </motion.div>
          </section>
        </>
      )}

      {/* ============================================
          실제 후기
      ============================================ */}
      <section id="reviews" className="py-12 px-4 bg-white border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="w-full"
        >
          <div className="text-center mb-8">
            <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-yellow-400 text-black text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] mb-3">
              💬 REAL REVIEWS
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl font-black text-black mb-2 break-keep">
              실제 구매 후기
            </motion.h2>
            <motion.button
              variants={fadeInUp}
              onClick={() => setShowReviewModal(true)}
              className="text-xs text-slate-500 hover:text-black transition-colors underline underline-offset-4"
            >
              전체 리뷰 보기 →
            </motion.button>
          </div>

          {/* 리뷰 통계 */}
          {reviewStats && (
            <motion.div variants={fadeInUp} className="mb-6">
              <ReviewStats
                stats={reviewStats}
                onRatingFilter={setReviewRatingFilter}
                selectedRating={reviewRatingFilter}
              />
            </motion.div>
          )}

          {/* 리뷰 목록 */}
          <motion.div variants={fadeInUp}>
            <ReviewList
              programType="le-quack"
              currentUserId={currentUserId}
              ratingFilter={reviewRatingFilter}
              onRatingFilterChange={setReviewRatingFilter}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================
          하단 고정 구매 버튼
      ============================================ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-black p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="max-w-[455px] mx-auto">
          <button
            onClick={handlePurchaseClick}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-black text-base rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShoppingCart size={18} />
            지금 바로 구매하기
          </button>
        </div>
      </div>

      {/* 하단 여백 (고정 버튼 공간) */}
      <div className="h-24" />

      {/* ============================================
          로그인 안내 모달
      ============================================ */}
      <AnimatePresence>
        {showLoginPrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginPrompt(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-black"
            >
              <div className="relative p-6 pb-4 text-center bg-gradient-to-b from-amber-50 to-white">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>

                <div className="w-16 h-16 mx-auto mb-4 bg-amber-400 rounded-2xl flex items-center justify-center shadow-lg border-2 border-black shadow-[4px_4px_0_0_black]">
                  <span className="text-3xl">🦆</span>
                </div>

                <h2 className="text-xl font-black text-slate-900 mb-2">로그인하고 구매하기</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  로그인하면 주문 내역을<br />
                  <span className="font-bold text-amber-600">마이페이지에서 확인</span>할 수 있어요!
                </p>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-y-2 border-black">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-slate-600">로그인하면 주문 내역이 저장돼요</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-slate-600">배송 조회를 편하게 할 수 있어요</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">!</span>
                    <span className="text-slate-600">비회원도 구매는 가능해요</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-3">
                <button
                  onClick={handleLoginClick}
                  className="w-full h-14 bg-black text-white rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_#FCD34D] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#FCD34D] transition-all border-2 border-black"
                >
                  로그인 / 회원가입
                </button>

                <button
                  onClick={handleGuestPurchase}
                  className="w-full h-12 bg-white text-slate-600 rounded-2xl font-semibold border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2"
                >
                  <span>비회원으로 구매하기</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 로그인 모달 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectPath="/checkout?product=le-quack&type=signature"
      />

      {/* 리뷰 모달 */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        programType="le-quack"
        programName="시그니처 뿌덕퍼퓸"
        currentUserId={currentUserId}
        onWriteReview={() => {
          setShowReviewModal(false)
          setShowReviewWriteModal(true)
        }}
      />

      {/* 리뷰 작성 모달 */}
      <ReviewWriteModal
        isOpen={showReviewWriteModal}
        onClose={() => setShowReviewWriteModal(false)}
        programType="le-quack"
        programName="시그니처 뿌덕퍼퓸"
        userId={currentUserId || ''}
        onSuccess={() => {
          // 리뷰 통계 새로고침
          getReviewStats('le-quack').then(setReviewStats)
        }}
      />
    </main>
    </InactiveProductGuard>
  )
}
