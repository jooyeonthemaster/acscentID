"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Sparkles, Star, X, AlertTriangle,
  Truck, ChevronRight,
  Box, Droplets, PenTool, Gem, Camera
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { AuthModal } from "@/components/auth/AuthModal"
import { ReviewModal, ReviewTrigger, ReviewWriteModal, ReviewStats, ReviewList } from "@/components/review"
import { getReviewStats } from "@/lib/supabase/reviews"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"

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

export default function FigurePage() {
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
        const stats = await getReviewStats('figure')
        setReviewStats(stats)
      } catch (error) {
        console.error('Failed to load review stats:', error)
      }
    }
    loadReviewStats()
  }, [])

  const productImages = [
    "/제목 없는 디자인 (3)/1.png",
    "/제목 없는 디자인 (3)/2.png",
    "/제목 없는 디자인 (3)/3.png",
  ]

  const handleStartClick = () => {
    if (loading) return
    if (isLoggedIn) {
      router.push("/input?type=figure")
    } else {
      setShowLoginPrompt(true)
    }
  }

  const handleGuestStart = () => {
    router.push("/input?type=figure")
    setShowLoginPrompt(false)
  }

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  const productComponents = [
    { icon: Box, name: "3D 모델링 피규어", desc: "룩업 스타일 단색 피규어", color: "bg-cyan-400" },
    { icon: Gem, name: "샤쉐스톤", desc: "향기를 담는 천연석", color: "bg-purple-400" },
    { icon: Droplets, name: "시그니처 디퓨저", desc: "피규어 전용 스팟", color: "bg-blue-400" },
    { icon: Sparkles, name: "AI 맞춤 향 에센스 5ml", desc: "캐릭터 분석 기반", color: "bg-yellow-400" },
  ]

  return (
    <main className="relative min-h-screen bg-[#F0FDFF] font-sans">
      <Header />

      {/* ============================================
          HERO SECTION - 제품 갤러리 + 정보
      ============================================ */}
      <section className="pt-36 lg:pt-52 pb-12 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">

            {/* 왼쪽: 이미지 갤러리 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 lg:max-w-[45%]"
            >
              {/* 메인 이미지 */}
              <div className="relative bg-white border-2 border-black rounded-2xl lg:rounded-3xl overflow-hidden shadow-[6px_6px_0_0_black] lg:shadow-[8px_8px_0_0_black] mb-3 lg:mb-4">
                <div className="absolute top-3 left-3 lg:top-4 lg:left-4 z-10 flex gap-2">
                  <span className="px-2 lg:px-3 py-0.5 lg:py-1 bg-cyan-400 text-black text-[10px] lg:text-xs font-black rounded-full border-2 border-black">
                    NEW
                  </span>
                  <span className="px-2 lg:px-3 py-0.5 lg:py-1 bg-purple-400 text-white text-[10px] lg:text-xs font-black rounded-full border-2 border-black">
                    DIY KIT
                  </span>
                </div>
                <div className="aspect-square flex items-center justify-center p-6 lg:p-8 bg-gradient-to-br from-cyan-50 to-blue-50">
                  <motion.img
                    key={selectedImage}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    src={productImages[selectedImage]}
                    alt="제품 이미지"
                    className="w-[80%] h-[80%] lg:w-[85%] lg:h-[85%] object-contain"
                  />
                </div>
              </div>

              {/* 썸네일 */}
              <div className="flex gap-2 lg:gap-3 justify-center">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-16 lg:w-18 lg:h-18 rounded-lg lg:rounded-xl border-2 overflow-hidden transition-all ${
                      selectedImage === idx
                        ? 'border-black shadow-[2px_2px_0_0_black] lg:shadow-[3px_3px_0_0_black] scale-105'
                        : 'border-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain bg-white p-1" />
                  </button>
                ))}
              </div>
            </motion.div>

            {/* 오른쪽: 제품 정보 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1"
            >
              {/* 브레드크럼 */}
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                <Link href="/" className="hover:text-black">홈</Link>
                <ChevronRight size={14} />
                <Link href="/" className="hover:text-black">프로그램</Link>
                <ChevronRight size={14} />
                <span className="text-black font-bold">3D 피규어 디퓨저</span>
              </div>

              {/* 타이틀 */}
              <div className="mb-5">
                <div className="mb-2">
                  <ReviewTrigger
                    averageRating={reviewStats?.average_rating || 4.8}
                    totalCount={reviewStats?.total_count || 0}
                    onClick={() => setShowReviewModal(true)}
                  />
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-black leading-tight mb-2">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500">
                    3D 피규어 디퓨저
                  </span>
                </h1>
                <p className="text-sm lg:text-base text-slate-600 font-medium">
                  좋아하는 최애 이미지로 제작되는<br />
                  나만의 최애 피규어 디퓨저
                </p>
              </div>

              {/* 가격 + 구성품 안내 */}
              <div className="bg-white border-2 border-black rounded-xl lg:rounded-2xl p-4 lg:p-5 shadow-[3px_3px_0_0_black] lg:shadow-[4px_4px_0_0_black] mb-5">
                {/* 가격 */}
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-xl lg:text-2xl font-black text-black">48,000원</span>
                  <span className="text-xs lg:text-sm text-slate-400 line-through">68,000원</span>
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">29% OFF</span>
                </div>

                {/* 구성품 안내 */}
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg lg:rounded-xl p-2.5 lg:p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Star size={14} className="fill-cyan-400 text-cyan-400" />
                    <span className="font-bold text-xs lg:text-sm text-black">3D 피규어 + 디퓨저(5ml) + 실물 분석보고서</span>
                  </div>
                  <ul className="space-y-0.5 text-[11px] lg:text-xs text-slate-600 pl-5">
                    <li className="list-disc">샤쉐스톤 + AI 맞춤 향 에센스 포함</li>
                    <li className="list-disc">제작 후 2~3일 배송</li>
                  </ul>
                </div>
              </div>

              {/* CTA 버튼 */}
              <button
                onClick={handleStartClick}
                disabled={loading}
                className="w-full py-4 lg:py-5 bg-gradient-to-r from-cyan-400 to-blue-400 text-black font-black text-lg lg:text-xl rounded-xl lg:rounded-2xl border-2 border-black shadow-[4px_4px_0_0_black] lg:shadow-[6px_6px_0_0_black] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_black] lg:hover:translate-x-[3px] lg:hover:translate-y-[3px] lg:hover:shadow-[3px_3px_0_0_black] transition-all flex items-center justify-center gap-2 lg:gap-3 disabled:opacity-50"
              >
                지금 바로 제작하기
              </button>

              <p className="text-center text-xs lg:text-sm text-slate-500 mt-2 lg:mt-3">
                최애 사진만 보내주세요! 3D 피규어로 만들어드려요
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================
          구성품 배너
      ============================================ */}
      <section className="py-8 px-4 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-white">
            {productComponents.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <item.icon size={18} className="text-cyan-400" />
                <span className="font-bold text-sm">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          구성품 상세
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-gradient-to-b from-[#F0FDFF] to-white">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-cyan-400 text-black text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_black] mb-4">
              📦 PACKAGE
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black">
              풀 패키지 구성품
            </motion.h2>
          </div>

          {/* 메인 구성품 - 2x2 그리드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {productComponents.map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="group relative bg-white border-2 border-black rounded-2xl lg:rounded-3xl p-5 lg:p-6 shadow-[4px_4px_0_0_black] lg:shadow-[6px_6px_0_0_black] hover:shadow-[6px_6px_0_0_black] lg:hover:shadow-[8px_8px_0_0_black] transition-shadow"
              >
                {/* 번호 배지 */}
                <div className="absolute -top-2 -right-2 lg:-top-3 lg:-right-3 w-7 h-7 lg:w-8 lg:h-8 bg-black text-white rounded-full flex items-center justify-center font-black text-xs lg:text-sm border-2 border-white">
                  {idx + 1}
                </div>

                {/* 아이콘 */}
                <div className={`w-14 h-14 lg:w-16 lg:h-16 ${item.color} border-2 border-black rounded-xl lg:rounded-2xl shadow-[3px_3px_0_0_black] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  <item.icon size={28} className="text-white lg:w-8 lg:h-8" />
                </div>

                {/* 텍스트 */}
                <h3 className="font-black text-sm lg:text-base text-black mb-1 text-center">{item.name}</h3>
                <p className="text-xs lg:text-sm text-slate-500 text-center">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* 하단 안내 */}
          <motion.div variants={fadeInUp} className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-100 to-purple-100 rounded-full border border-slate-200">
              <Truck size={16} className="text-slate-600" />
              <span className="text-sm text-slate-600 font-medium">전 구성품 한 박스에 담아 배송!</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================
          진행 과정
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-[#F0FDFF]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-blue-400 text-white text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_black] mb-4">
              📋 PROCESS
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black">
              어떻게 진행되나요?
            </motion.h2>
          </div>

          {/* 모바일: 2x2 그리드 / 데스크톱: 4열 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            {[
              { step: "01", title: "이미지 전송", desc: "최애 사진을 업로드해요", icon: Camera, color: "bg-cyan-400" },
              { step: "02", title: "3D 모델링", desc: "AI가 룩업 스타일로 제작", icon: Box, color: "bg-blue-400" },
              { step: "03", title: "향기 분석", desc: "캐릭터에 맞는 향 조향", icon: Sparkles, color: "bg-purple-400" },
              { step: "04", title: "키트 배송", desc: "풀 패키지로 배송!", icon: Truck, color: "bg-pink-400" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="relative bg-white border-2 border-black rounded-xl lg:rounded-2xl p-4 lg:p-5 shadow-[3px_3px_0_0_black] lg:shadow-[4px_4px_0_0_black]"
              >
                {/* 스텝 번호 배지 */}
                <div className="absolute -top-2 -left-2 lg:-top-3 lg:-left-3 w-7 h-7 lg:w-8 lg:h-8 bg-black text-white rounded-full flex items-center justify-center font-black text-xs border-2 border-white">
                  {item.step}
                </div>

                {/* 아이콘 */}
                <div className={`w-12 h-12 lg:w-16 lg:h-16 ${item.color} border-2 border-black rounded-xl lg:rounded-2xl shadow-[2px_2px_0_0_black] flex items-center justify-center mx-auto mb-3`}>
                  <item.icon size={24} className="text-white lg:w-8 lg:h-8" />
                </div>

                {/* 텍스트 */}
                <h3 className="text-sm lg:text-base font-black text-black mb-1 text-center">{item.title}</h3>
                <p className="text-[11px] lg:text-sm text-slate-500 text-center leading-tight">{item.desc}</p>

                {/* 연결 화살표 (마지막 아이템 제외) */}
                {idx < 3 && (
                  <div className={`hidden lg:flex absolute top-1/2 -right-4 w-8 h-8 items-center justify-center text-slate-300 font-bold text-xl ${idx === 1 ? 'lg:hidden' : ''}`}>
                    →
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* 하단 진행 표시 */}
          <motion.div variants={fadeInUp} className="mt-6 flex justify-center items-center gap-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="flex items-center">
                  <div className="w-2 h-2 lg:w-3 lg:h-3 bg-black rounded-full" />
                  {num < 4 && <div className="w-4 lg:w-8 h-0.5 bg-black" />}
                </div>
              ))}
            </div>
            <span className="text-xs lg:text-sm text-slate-500 ml-2">약 3-5일 소요</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================
          결과물 미리보기
      ============================================ */}
      <section className="py-10 lg:py-16 px-4 md:px-8 bg-white border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-8 lg:mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-3 lg:px-4 py-1.5 lg:py-2 bg-pink-400 text-white text-xs lg:text-sm font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] lg:shadow-[3px_3px_0_0_black] mb-3 lg:mb-4">
              🎁 RESULT PREVIEW
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl md:text-3xl lg:text-4xl font-black text-black mb-3 lg:mb-4">
              이렇게 완성돼요!
            </motion.h2>
          </div>

          <motion.div variants={fadeInUp} className="bg-gradient-to-br from-cyan-50 to-purple-50 border-2 border-black rounded-2xl lg:rounded-3xl p-4 lg:p-10 shadow-[4px_4px_0_0_black] lg:shadow-[8px_8px_0_0_black]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">

              {/* 왼쪽: 완성 과정 */}
              <div className="space-y-4">
                <div className="bg-white border-2 border-black rounded-xl lg:rounded-2xl p-4 lg:p-5 shadow-[3px_3px_0_0_black] lg:shadow-[4px_4px_0_0_black]">
                  <h4 className="font-black text-base lg:text-lg mb-3 lg:mb-4 flex items-center gap-2">
                    <PenTool size={18} className="text-pink-500 lg:w-5 lg:h-5" />
                    DIY 색칠 과정
                  </h4>
                  <div className="flex items-center justify-between gap-1 lg:gap-4">
                    <div className="flex-1 text-center min-w-0">
                      <div className="w-12 h-12 lg:w-16 lg:h-16 mx-auto bg-slate-100 rounded-lg lg:rounded-xl border-2 border-black mb-1.5 lg:mb-2 flex items-center justify-center">
                        <span className="text-lg lg:text-2xl">⬜</span>
                      </div>
                      <p className="text-[10px] lg:text-xs font-bold text-slate-500">단색 피규어</p>
                    </div>
                    <div className="text-base lg:text-2xl text-slate-400 flex-shrink-0">→</div>
                    <div className="flex-1 text-center min-w-0">
                      <div className="w-12 h-12 lg:w-16 lg:h-16 mx-auto bg-gradient-to-br from-pink-200 to-purple-200 rounded-lg lg:rounded-xl border-2 border-black mb-1.5 lg:mb-2 flex items-center justify-center">
                        <span className="text-lg lg:text-2xl">🎨</span>
                      </div>
                      <p className="text-[10px] lg:text-xs font-bold text-slate-500">직접 색칠</p>
                    </div>
                    <div className="text-base lg:text-2xl text-slate-400 flex-shrink-0">→</div>
                    <div className="flex-1 text-center min-w-0">
                      <div className="w-12 h-12 lg:w-16 lg:h-16 mx-auto bg-gradient-to-br from-cyan-200 to-blue-200 rounded-lg lg:rounded-xl border-2 border-black mb-1.5 lg:mb-2 flex items-center justify-center">
                        <span className="text-lg lg:text-2xl">✨</span>
                      </div>
                      <p className="text-[10px] lg:text-xs font-bold text-slate-500">완성!</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-black rounded-xl lg:rounded-2xl p-4 lg:p-5 shadow-[3px_3px_0_0_black] lg:shadow-[4px_4px_0_0_black]">
                  <h4 className="font-black text-base lg:text-lg mb-2 lg:mb-3 flex items-center gap-2">
                    <Droplets size={18} className="text-blue-500 lg:w-5 lg:h-5" />
                    디퓨저 사용법
                  </h4>
                  <div className="space-y-1.5 lg:space-y-2 text-xs lg:text-sm">
                    <div className="flex items-center gap-2 lg:gap-3 p-1.5 lg:p-2 bg-cyan-50 rounded-lg">
                      <span className="w-5 h-5 lg:w-6 lg:h-6 bg-cyan-400 text-white rounded-full flex items-center justify-center text-[10px] lg:text-xs font-bold border border-black flex-shrink-0">1</span>
                      <span>샤쉐스톤을 디퓨저 스팟에 올려요</span>
                    </div>
                    <div className="flex items-center gap-2 lg:gap-3 p-1.5 lg:p-2 bg-cyan-50 rounded-lg">
                      <span className="w-5 h-5 lg:w-6 lg:h-6 bg-cyan-400 text-white rounded-full flex items-center justify-center text-[10px] lg:text-xs font-bold border border-black flex-shrink-0">2</span>
                      <span>AI 맞춤 향 에센스를 스톤에 뿌려요</span>
                    </div>
                    <div className="flex items-center gap-2 lg:gap-3 p-1.5 lg:p-2 bg-cyan-50 rounded-lg">
                      <span className="w-5 h-5 lg:w-6 lg:h-6 bg-cyan-400 text-white rounded-full flex items-center justify-center text-[10px] lg:text-xs font-bold border border-black flex-shrink-0">3</span>
                      <span>피규어와 함께 전시하면 끝! 💕</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 오른쪽: 완성품 이미지 */}
              <div className="flex flex-col items-center mt-4 lg:mt-0">
                <div className="relative">
                  <div className="w-48 h-48 lg:w-64 lg:h-64 bg-white border-2 border-black rounded-2xl lg:rounded-3xl shadow-[4px_4px_0_0_black] lg:shadow-[6px_6px_0_0_black] flex items-center justify-center overflow-hidden">
                    <img src="/제목 없는 디자인 (3)/1.png" alt="완성품" className="w-[80%] h-[80%] object-contain" />
                  </div>
                  <div className="absolute -top-2 -right-2 lg:-top-3 lg:-right-3 px-2.5 lg:px-4 py-1 lg:py-2 bg-cyan-400 text-black font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] text-xs lg:text-sm">
                    3D 제작 ✨
                  </div>
                </div>
                <div className="mt-4 lg:mt-6 text-center">
                  <h3 className="text-xl lg:text-2xl font-black text-black mb-1 lg:mb-2">나만의 최애 피규어</h3>
                  <p className="text-sm lg:text-base text-slate-600">세상에 하나뿐인 DIY 굿즈 완성!</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================
          실제 후기
      ============================================ */}
      <section id="reviews" className="py-16 px-4 md:px-8 bg-white">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-yellow-400 text-black text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_black] mb-4">
              💬 REAL REVIEWS
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black mb-2">
              덕후들의 실제 후기
            </motion.h2>
            <motion.button
              variants={fadeInUp}
              onClick={() => setShowReviewModal(true)}
              className="text-sm text-slate-500 hover:text-black transition-colors underline underline-offset-4"
            >
              전체 리뷰 보기 →
            </motion.button>
          </div>

          {/* 리뷰 통계 */}
          {reviewStats && (
            <motion.div variants={fadeInUp} className="mb-8">
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
              programType="figure"
              currentUserId={currentUserId}
              ratingFilter={reviewRatingFilter}
              onRatingFilterChange={setReviewRatingFilter}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================
          최종 CTA
      ============================================ */}
      <section className="py-20 px-4 md:px-8 bg-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
            세상에 하나뿐인<br />
            <span className="text-cyan-400">나만의 최애 피규어</span>
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            최애 사진 한 장이면 3D 피규어로 만들어드려요.<br />
            직접 색칠하고, 향기까지 더해서 나만의 굿즈 완성!
          </p>

          <button
            onClick={handleStartClick}
            disabled={loading}
            className="inline-flex items-center justify-center gap-3 px-12 py-6 bg-cyan-400 text-black font-black text-xl rounded-2xl border-2 border-black shadow-[8px_8px_0_0_white] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[4px_4px_0_0_white] transition-all disabled:opacity-50"
          >
            <Box size={28} />
            지금 바로 주문하기
          </button>

          <p className="text-slate-500 mt-6 text-sm">
            제작 기간: 3D 모델링 완료 후 2~3일 배송 🚀
          </p>
        </motion.div>
      </section>

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
              <div className="relative p-6 pb-4 text-center bg-gradient-to-b from-cyan-50 to-white">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>

                <div className="w-16 h-16 mx-auto mb-4 bg-cyan-400 rounded-2xl flex items-center justify-center shadow-lg border-2 border-black shadow-[4px_4px_0_0_black]">
                  <AlertTriangle size={28} className="text-black" />
                </div>

                <h2 className="text-xl font-black text-slate-900 mb-2">잠깐! 🤔</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  로그인하지 않으면 주문 내역이<br />
                  <span className="font-bold text-red-500">저장되지 않아요!</span>
                </p>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-y-2 border-black">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-slate-600">로그인하면 주문 내역이 자동 저장돼요</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-slate-600">마이페이지에서 제작 현황을 확인할 수 있어요</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">!</span>
                    <span className="text-slate-600">비회원은 주문 조회가 어려워요</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-3">
                <button
                  onClick={handleLoginClick}
                  className="w-full h-14 bg-black text-white rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_#22d3ee] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#22d3ee] transition-all border-2 border-black"
                >
                  로그인 / 회원가입
                </button>

                <button
                  onClick={handleGuestStart}
                  className="w-full h-12 bg-white text-slate-600 rounded-2xl font-semibold border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2"
                >
                  <span>비회원으로 시작하기</span>
                  <span className="text-xs text-slate-400">(저장 안됨)</span>
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
        redirectPath="/input?type=figure&mode=online"
      />

      {/* 리뷰 모달 */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        programType="figure"
        programName="3D 피규어 디퓨저"
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
        programType="figure"
        programName="3D 피규어 디퓨저"
        userId={currentUserId || ''}
        onSuccess={() => {
          // 리뷰 통계 새로고침
          getReviewStats('figure').then(setReviewStats)
        }}
      />
    </main>
  )
}
