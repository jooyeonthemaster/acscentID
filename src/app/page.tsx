"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ChevronRight, User } from "lucide-react"
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
    tags: ["맞춤퍼퓸", "AI분석"],
    badge: "",
    badgeColor: "bg-[#FF6B9D]",
    accentColor: "bg-[#FBCFE8]",
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
    tags: ["피규어", "커스텀"],
    badge: "NEW",
    badgeColor: "bg-[#A78BFA]",
    accentColor: "bg-[#A5F3FC]",
    isNew: true,
    href: "/programs/figure"
  }
]

export default function Home() {
  const router = useRouter()
  const { user, unifiedUser, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
    const [userStats, setUserStats] = useState({ analysisCount: 0, recipeCount: 0 })

  const isLoggedIn = !!(user || unifiedUser)
  const userName = user?.user_metadata?.name || unifiedUser?.name || user?.email?.split('@')[0] || "Guest"


  const fetchUserStats = useCallback(async () => {
    if (!isLoggedIn) return
    try {
      const fingerprint = typeof window !== 'undefined' ? localStorage.getItem('user_fingerprint') : null
      const url = fingerprint ? `/api/user/data?fingerprint=${encodeURIComponent(fingerprint)}` : '/api/user/data'
      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) {
        setUserStats({ analysisCount: data.analyses?.length || 0, recipeCount: data.recipes?.length || 0 })
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (isLoggedIn) fetchUserStats()
  }, [isLoggedIn, fetchUserStats])

  const handleCardClick = (href: string) => {
    if (loading) return
    if (isLoggedIn) {
      router.push(href)
    } else {
      setShowAuthModal(true)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFDF5] font-sans selection:bg-yellow-200 selection:text-yellow-900 relative">
      {/* 배경 이미지 */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/images/hero/forest_bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="relative z-10">
        <Header />

      {/* 모바일 우선 레이아웃 (390px 기준) */}
      <main className="pt-28 pb-24 px-4">
        <div className="max-w-7xl mx-auto">

          {/* ===== 프로필 / 로그인 카드 (상단 납작하게) ===== */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5"
          >
            {isLoggedIn ? (
              // 로그인 상태: 프로필 카드
              <div className="bg-gradient-to-r from-[#FEF08A] to-[#FACC15] border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_#000] overflow-hidden">
                <div className="flex items-center justify-between p-3">
                  {/* 프로필 정보 */}
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#000]">
                      <User size={22} className="text-slate-900" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">{userName}</h3>
                      <p className="text-slate-600 text-[10px] font-medium">향기 컬렉터</p>
                    </div>
                  </div>
                  {/* 스탯 */}
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-lg font-black text-slate-900">{userStats.analysisCount}</div>
                      <div className="text-[8px] font-bold text-slate-500 uppercase">분석</div>
                    </div>
                    <div className="w-px h-8 bg-slate-900/20" />
                    <div className="text-center">
                      <div className="text-lg font-black text-slate-900">{userStats.recipeCount}</div>
                      <div className="text-[8px] font-bold text-slate-500 uppercase">레시피</div>
                    </div>
                    <button
                      onClick={() => router.push('/mypage')}
                      className="ml-2 w-9 h-9 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      <ChevronRight size={18} className="text-slate-900" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // 비로그인 상태: 로그인 유도
              <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_#000] p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#FEF9C3] border-2 border-slate-900 flex items-center justify-center">
                      <User size={20} className="text-slate-700" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">로그인하고 시작하기</h3>
                      <p className="text-slate-500 text-[10px] font-medium">나만의 향기 레시피를 저장해요</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-4 py-2 bg-[#FEF9C3] text-slate-900 font-bold text-xs rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  >
                    로그인
                  </button>
                </div>
              </div>
            )}
          </motion.section>


          {/* ===== 상품 카드 리스트 ===== */}
          <section className="space-y-12 mt-16">
            {PRODUCTS.map((product, index) => (
              <NFTStyleCard
                key={product.id}
                product={product}
                index={index}
                onClick={() => handleCardClick(product.href)}
              />
            ))}
          </section>

        </div>
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
      </div>
    </div>
  )
}

// ============================================================
// NFT 스타일 카드 (레퍼런스 이미지 기반)
// ============================================================

interface NFTStyleCardProps {
  product: typeof PRODUCTS[0]
  index: number
  onClick: () => void
}

function NFTStyleCard({ product, index, onClick }: NFTStyleCardProps) {
  const isReversed = index % 2 === 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className="group relative cursor-pointer"
    >
      {/* 이미지 - 크게! 여백 없이 꽉 차게 */}
      <div
        className={`relative w-[60%] aspect-square ${product.accentColor} rounded-[20px] border-2 border-slate-900 shadow-[4px_4px_0px_#000] overflow-hidden ${
          isReversed ? 'ml-auto mr-[-8px] rotate-[3deg]' : 'ml-[-8px] -rotate-[3deg]'
        }`}
      >
        <Image
          src={product.image}
          alt={product.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          style={{ transform: isReversed ? 'scale(1.15) translateX(8%)' : 'scale(1.15) translateX(-8%)', transformOrigin: 'center' }}
        />
        {/* 뱃지 */}
        {product.badge && (
          <div className={`absolute top-3 left-3 px-2.5 py-1 ${product.badgeColor} text-white text-[9px] font-black rounded-full border border-white/30`}>
            {product.badge}
          </div>
        )}
      </div>

      {/* 정보 카드 - 더 크게! */}
      <div
        className={`absolute bottom-2 ${isReversed ? 'left-0' : 'right-0'} w-[60%] bg-white border-2 border-slate-900 rounded-2xl p-4 shadow-[3px_3px_0px_#000] group-hover:shadow-[1px_1px_0px_#000] group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all`}
      >
        <h3 className="font-black text-slate-900 text-base leading-tight mb-1">
          {product.title}
        </h3>
        <p className="text-[11px] text-slate-500 font-bold mb-3 whitespace-pre-line">{product.subtitle}</p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {product.tags.map((tag) => (
            <span key={tag} className="text-[9px] px-2 py-0.5 bg-slate-100 rounded-full font-bold text-slate-500">
              #{tag}
            </span>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100">
          <div className="font-black text-slate-900 text-xl">
            ₩{product.price.toLocaleString()}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
