"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight, ChevronLeft, Search, Gift } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { AuthModal } from "@/components/auth/AuthModal"
import Image from "next/image"

// 상품 데이터
const PRODUCTS = [
  {
    id: "idol-image",
    category: "perfume",
    title: "AI 이미지 분석 퍼퓸",
    subtitle: "좋아하는 이미지로 추출하는\n나만의 퍼퓸",
    image: "/images/perfume/KakaoTalk_20260125_225218071.jpg",
    price: 24000,
    originalPrice: 35000,
    discount: 31,
    includes: "뿌덕퍼퓸(10ml/50ml) + 실물 분석보고서",
    delivery: "주문 후 2~3일 내 배송",
    tags: ["맞춤퍼퓸", "AI분석"],
    badge: "31% OFF",
    badgeColor: "bg-[#FF6B9D]",
    isNew: false,
    href: "/programs/idol-image"
  },
  {
    id: "figure",
    category: "diffuser",
    title: "피규어 화분 디퓨저",
    subtitle: "좋아하는 이미지로 제작되는\n나만의 화분 피규어 디퓨저",
    image: "/images/diffuser/KakaoTalk_20260125_225229624.jpg",
    price: 48000,
    originalPrice: 68000,
    discount: 29,
    includes: "3D 피규어 + 디퓨저(5ml) + 실물 분석보고서\n샤쉐스톤 + AI 맞춤 향 에센스 포함",
    delivery: "제작 후 2~3일 내 배송",
    tags: ["피규어", "커스텀"],
    badge: "NEW",
    badgeColor: "bg-[#A78BFA]",
    isNew: true,
    href: "/programs/figure"
  },
  {
    id: "graduation",
    category: "perfume",
    title: "졸업 기념 퍼퓸",
    subtitle: "졸업의 추억을 향기로\n특별한 졸업 기념 퍼퓸",
    image: "/images/jollduck/KakaoTalk_20260130_201156204.jpg",
    price: 34000,
    originalPrice: 49000,
    discount: 31,
    includes: "뿌덕퍼퓸(10ml/50ml) + 졸업 분석보고서",
    delivery: "주문 후 2~3일 내 배송",
    tags: ["졸업", "기념향"],
    badge: "~2/28 한정",
    badgeColor: "bg-red-500",
    isNew: true,
    limitedUntil: "2/28",
    href: "/programs/graduation"
  }
]

export default function Home() {
  const router = useRouter()
  const { user, unifiedUser, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const slideRef = useRef<HTMLDivElement>(null)

  const isLoggedIn = !!(user || unifiedUser)

  const handleCardClick = (href: string) => {
    if (loading) return
    if (isLoggedIn) {
      router.push(href)
    } else {
      setShowAuthModal(true)
    }
  }

  // 히어로 슬라이드는 2개만 사용
  const HERO_SLIDE_COUNT = 2

  // 슬라이드 네비게이션
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDE_COUNT)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDE_COUNT) % HERO_SLIDE_COUNT)
  }

  // 드래그 핸들러
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number } }) => {
    setIsDragging(false)
    const threshold = 50
    if (info.offset.x < -threshold) {
      nextSlide()
    } else if (info.offset.x > threshold) {
      prevSlide()
    }
  }

  return (
    <div className="min-h-screen bg-[#FCD34D] font-sans selection:bg-yellow-200 selection:text-yellow-900">
      <Header />

      {/* 메인 컨텐츠 */}
      <main className="pt-[84px]">
        <div className="w-full max-w-[455px] mx-auto">

          {/* ===== 히어로 슬라이드 섹션 ===== */}
          <section className="sticky top-[84px] z-0 w-full overflow-hidden">
            {/* 슬라이드 컨테이너 */}
            <div className="relative h-[420px] flex items-center justify-center">
              {/* 슬라이드 */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentSlide}
                  ref={slideRef}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={handleDragEnd}
                  className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                  onClick={() => {
                    if (!isDragging) handleCardClick(PRODUCTS[currentSlide].href)
                  }}
                >
                  {/* 슬라이드 배경 이미지 */}
                  <div className="absolute inset-0">
                    <Image
                      src={
                        currentSlide === 0 ? "/images/hero/1.jpg" :
                          "/images/hero/2.jpg"
                      }
                      alt="hero background"
                      fill
                      className="object-contain"
                      style={{ objectPosition: 'center 5%' }}
                      priority
                    />
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* 좌우 네비게이션 버튼 */}
              <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#000] hover:bg-white transition-all active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                <ChevronLeft size={20} className="text-slate-900" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#000] hover:bg-white transition-all active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                <ChevronRight size={20} className="text-slate-900" />
              </button>

              {/* 페이지네이션 도트 - 이미지 위에 오버레이 */}
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {[0, 1].map((index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${index === currentSlide
                      ? 'bg-white w-6 shadow-md'
                      : 'bg-white/50 hover:bg-white/70'
                      }`}
                  />
                ))}
              </div>
            </div>
          </section>


          {/* Wrapper for Sticky Control */}
          <div className="relative">
            {/* ===== 프로그램 둘러보기 섹션 ===== */}
            <section className="bg-white px-4 pt-8 pb-[180px] rounded-t-[32px] -mt-[72px] md:-mt-12 sticky top-[84px] z-10 min-h-[50vh] border-2 border-slate-900 border-b-0">
              {/* 섹션 타이틀 */}
              <div className="flex items-center gap-2 mb-6">
                <Search size={20} className="text-slate-900" />
                <h2 className="text-lg font-black text-slate-900">프로그램 둘러보기</h2>
              </div>

              {/* 2열 그리드 카드 */}
              <div className="grid grid-cols-2 gap-3">
                {PRODUCTS.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleCardClick(product.href)}
                    className="group cursor-pointer"
                  >
                    <div className="relative bg-[#FEF3C7] rounded-2xl border-2 border-slate-900 overflow-hidden shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                      {/* 카드 이미지 */}
                      <div className="relative aspect-square overflow-hidden">
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* 뱃지 */}
                        {product.badge && (
                          <div className={`absolute top-2 left-2 px-2 py-0.5 ${product.badgeColor} text-white text-[8px] font-black rounded-full ${product.limitedUntil ? 'animate-pulse' : ''}`}>
                            {product.badge}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* 카드 타이틀 (카드 밖) */}
                    <div className="mt-5 px-1">
                      <h3 className="font-bold text-slate-900 text-sm truncate">
                        {product.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-2 whitespace-pre-line">
                        {product.subtitle}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-sm font-bold text-slate-900">
                          ₩{product.price.toLocaleString()}
                        </span>
                        {product.originalPrice && (
                          <span className="text-[10px] text-slate-400 line-through">
                            ₩{product.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <p className={`text-[9px] font-medium mt-1 ${product.limitedUntil ? 'text-red-500 font-bold' : 'text-emerald-600'}`}>
                        {product.limitedUntil ? `⏰ ${product.limitedUntil}까지 한정 판매` : product.delivery}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

            </section>
            {/* Sticky Track Spacer */}
            <div className="h-[150px] w-full" />
          </div>

          {/* ===== 상품 둘러보기 섹션 (New) ===== */}
          <section className="bg-white px-4 pt-12 pb-32 rounded-t-[32px] -mt-[150px] relative z-20 min-h-[60vh] border-2 border-slate-900 border-b-0">
            <div className="flex items-center gap-2 mb-6">
              <Gift size={20} className="text-slate-900" />
              <h2 className="text-lg font-black text-slate-900">상품 둘러보기</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Product Card 1 - LE QUACK Signature (Coming Soon) */}
              <div className="relative group cursor-default">
                <div className="relative bg-[#FEF3C7] rounded-2xl border-2 border-slate-900 overflow-hidden shadow-[4px_4px_0px_#000]">
                  <div className="relative aspect-square overflow-hidden bg-slate-200 flex items-center justify-center">
                    <div className="relative w-full h-full grayscale-[0.3]">
                      <Image
                        src="/images/perfume/LE QUACK.avif"
                        alt="LE QUACK"
                        fill
                        className="object-cover blur-sm"
                      />
                      {/* Coming Soon Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-20">
                        <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg transform -rotate-12 border-2 border-white">
                          COMING SOON
                        </span>
                      </div>
                    </div>

                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500/50 text-white text-[8px] font-black rounded-full z-10">
                      SIGNATURE
                    </div>
                  </div>
                </div>
                <div className="mt-2 px-1 opacity-50">
                  <h3 className="font-bold text-slate-900 text-sm truncate">
                    LE QUACK
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    시그니처 퍼퓸 + 오리 키링
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-sm font-bold text-slate-900">₩34,000</span>
                    <span className="text-[10px] text-slate-400 line-through">₩45,000</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-slate-400 font-light underline underline-offset-4 decoration-wavy decoration-yellow-400">
                More products coming soon!
              </p>
            </div>
          </section>

        </div>
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>
  )
}
