"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Sparkles, Camera, Star, Heart, CheckCircle2, X, AlertTriangle,
  Package, Truck, Clock, Gift, Shield, Zap, ChevronDown, ChevronRight,
  MessageCircle, ThumbsUp, Award, Palette, FileText
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { AuthModal } from "@/components/auth/AuthModal"

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

export default function IdolImagePage() {
  const router = useRouter()
  const { user, unifiedUser, loading } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const isLoggedIn = !!(user || unifiedUser)

  const productImages = [
    "/제목 없는 디자인 (3)/2.png",
    "/제목 없는 디자인 (3)/1.png",
    "/제목 없는 디자인 (3)/3.png",
  ]

  const handleStartClick = () => {
    if (loading) return
    if (isLoggedIn) {
      // 온라인 모드: 로그인 필수, 결과 페이지에서 구매 버튼 표시
      router.push("/input?type=idol_image&mode=online")
    } else {
      setShowLoginPrompt(true)
    }
  }

  const handleGuestStart = () => {
    // 온라인 서비스는 로그인 필수 - 비회원 시작 비활성화
    // 로그인 모달로 유도
    setShowAuthModal(true)
    setShowLoginPrompt(false)
  }

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  const reviews = [
    { name: "윤지★", idol: "방탄소년단 뷔", text: "진짜 뷔 느낌 그대로예요... 달달하면서 시크한 향이 너무 좋아요 ㅠㅠ", rating: 5 },
    { name: "민트초코", idol: "aespa 카리나", text: "언니 분위기 그대로! 시원하면서 세련된 향 완전 최애각", rating: 5 },
    { name: "덕질은행복", idol: "스트레이키즈 현진", text: "이 향 뿌리면 현진이 옆에 있는 느낌ㅋㅋㅋ 추천합니다!", rating: 5 },
  ]

  const faqs = [
    { q: "어떤 사진을 올려야 하나요?", a: "최애의 얼굴이 잘 보이는 사진이면 OK! 화보, 무대, 셀카 등 어떤 사진이든 분석 가능해요. 고화질일수록 더 정확한 분석이 가능합니다." },
    { q: "분석 결과가 마음에 안 들면요?", a: "피드백을 남겨주시면 AI가 다시 분석해서 더 맞춤화된 레시피를 제안해드려요. 무제한 피드백이 가능합니다!" },
    { q: "향수는 어떻게 받나요?", a: "결제 완료 후 2~3일 내에 예쁜 패키지에 담아 배송해드려요. 분석 보고서도 함께 동봉됩니다." },
    { q: "선물용으로 구매 가능한가요?", a: "물론이죠! 주문 시 선물 포장 옵션을 선택하시면 특별한 포장과 메시지 카드를 함께 보내드려요." },
  ]

  return (
    <main className="relative min-h-screen bg-[#FFFDF5] font-sans">
      <Header />

      {/* ============================================
          HERO SECTION - 제품 갤러리 + 정보
      ============================================ */}
      <section className="pt-32 pb-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

            {/* 왼쪽: 이미지 갤러리 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 lg:max-w-[55%]"
            >
              {/* 메인 이미지 */}
              <div className="relative bg-white border-2 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0_0_black] mb-4">
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  <span className="px-3 py-1 bg-yellow-400 text-black text-xs font-black rounded-full border-2 border-black">
                    BEST
                  </span>
                  <span className="px-3 py-1 bg-pink-400 text-white text-xs font-black rounded-full border-2 border-black">
                    K-POP
                  </span>
                </div>
                <div className="aspect-square flex items-center justify-center p-8 bg-gradient-to-br from-yellow-50 to-amber-50">
                  <motion.img
                    key={selectedImage}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    src={productImages[selectedImage]}
                    alt="제품 이미지"
                    className="w-[85%] h-[85%] object-contain"
                  />
                </div>
              </div>

              {/* 썸네일 */}
              <div className="flex gap-3 justify-center">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-20 h-20 rounded-xl border-2 overflow-hidden transition-all ${
                      selectedImage === idx
                        ? 'border-black shadow-[3px_3px_0_0_black] scale-105'
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
                <span className="text-black font-bold">AI 아이돌 이미지 분석</span>
              </div>

              {/* 타이틀 */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-bold text-slate-600 ml-1">4.9 (2,847)</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-black leading-tight mb-3">
                  AI 아이돌 이미지 분석<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500">
                    최애의 향기를 담다
                  </span>
                </h1>
                <p className="text-slate-600 font-medium">
                  레전드 짤 한 장으로 찾는 나만의 최애 향수
                </p>
              </div>

              {/* 태그 */}
              <div className="flex flex-wrap gap-2 mb-6">
                {["#AI분석", "#맞춤향수", "#K-POP", "#덕질필수", "#선물추천"].map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-bold rounded-full border border-yellow-300">
                    {tag}
                  </span>
                ))}
              </div>

              {/* 가격 */}
              <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_black] mb-6">
                <div className="flex items-end gap-3 mb-4">
                  <span className="text-4xl font-black text-black">24,000원</span>
                  <span className="text-lg text-slate-400 line-through">35,000원</span>
                  <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg">31% OFF</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Package size={16} className="text-yellow-600" />
                    <span>10ml 롤온 향수 포함</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Truck size={16} className="text-yellow-600" />
                    <span>주문 후 2~3일 배송 (무료배송)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Gift size={16} className="text-yellow-600" />
                    <span className="text-pink-600 font-bold">🎁 실물 분석 보고서 특별 증정!</span>
                  </div>
                </div>
              </div>

              {/* 옵션 선택 */}
              <div className="mb-6">
                <p className="text-sm font-bold text-slate-700 mb-2">용량 선택</p>
                <div className="flex gap-3">
                  <button className="flex-1 py-3 bg-black text-white font-bold rounded-xl border-2 border-black">
                    10ml · 24,000원
                  </button>
                  <button className="flex-1 py-3 bg-white text-black font-bold rounded-xl border-2 border-black hover:bg-yellow-50 transition-colors">
                    50ml · 48,000원
                  </button>
                </div>
              </div>

              {/* CTA 버튼 */}
              <button
                onClick={handleStartClick}
                disabled={loading}
                className="w-full py-5 bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-black text-xl rounded-2xl border-2 border-black shadow-[6px_6px_0_0_black] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_black] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <Camera size={24} />
                지금 바로 분석 시작하기
              </button>

              <p className="text-center text-sm text-slate-500 mt-3">
                💡 먼저 무료로 분석해보고, 마음에 드시면 결제하세요!
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================
          덕후 필수 배너
      ============================================ */}
      <section className="py-8 px-4 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 text-white">
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-yellow-400" />
              <span className="font-bold">100% 커스터마이징</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-yellow-400" />
              <span className="font-bold">실물 보고서 증정</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck size={20} className="text-yellow-400" />
              <span className="font-bold">2~3일 빠른 배송</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart size={20} className="text-yellow-400 fill-yellow-400" />
              <span className="font-bold">덕질 특화 분석</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          이런 분께 추천해요
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-gradient-to-b from-[#FFFDF5] to-yellow-50">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-yellow-400 text-black text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_black] mb-4">
              🎯 TARGET
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black">
              이런 덕후분들께 추천해요!
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { emoji: "💜", title: "최애 생각하면 심장이 뛰는 분", desc: "최애의 분위기를 향기로 간직하고 싶은 진정한 팬" },
              { emoji: "🎁", title: "덕메에게 특별한 선물을 주고 싶은 분", desc: "세상에 하나뿐인 맞춤 향수로 감동 선사" },
              { emoji: "✨", title: "나만의 시그니처 향을 찾고 싶은 분", desc: "최애처럼 매력적인 향기를 뿌리고 싶은 분" },
              { emoji: "📸", title: "레전드 짤을 소장하고 계신 분", desc: "그 사진의 분위기를 향기로 변환해드려요" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0_0_black] hover:shadow-[6px_6px_0_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
              >
                <div className="text-4xl mb-3">{item.emoji}</div>
                <h3 className="text-xl font-black text-black mb-2">{item.title}</h3>
                <p className="text-slate-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ============================================
          분석 결과 미리보기
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-white border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-pink-400 text-white text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_black] mb-4">
              📊 RESULT PREVIEW
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black mb-4">
              이런 분석 결과를 받아보실 수 있어요
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-slate-600 max-w-2xl mx-auto">
              AI가 이미지의 색감, 분위기, 감정을 분석하여 최애에게 어울리는 향수 레시피를 만들어드려요
            </motion.p>
          </div>

          {/* 결과 미리보기 카드 */}
          <motion.div variants={fadeInUp} className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-black rounded-3xl p-6 md:p-10 shadow-[8px_8px_0_0_black]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

              {/* 왼쪽: 분석 요약 */}
              <div className="space-y-6">
                <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_black]">
                  <h4 className="font-black text-lg mb-3 flex items-center gap-2">
                    <Palette size={20} className="text-purple-500" />
                    이미지 분석 결과
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">주요 컬러</span>
                      <div className="flex gap-1">
                        <div className="w-6 h-6 rounded-full bg-purple-400 border border-black" />
                        <div className="w-6 h-6 rounded-full bg-pink-300 border border-black" />
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-black" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">분위기 키워드</span>
                      <div className="flex gap-1">
                        {["시크", "달콤", "카리스마"].map((k) => (
                          <span key={k} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">{k}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">감정 분석</span>
                      <span className="font-bold text-black">신비로움 87%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_black]">
                  <h4 className="font-black text-lg mb-3 flex items-center gap-2">
                    <Sparkles size={20} className="text-yellow-500" />
                    추천 향수 레시피
                  </h4>
                  <div className="space-y-2">
                    {[
                      { note: "탑노트", scent: "베르가못, 블랙커런트", percent: "25%" },
                      { note: "미들노트", scent: "다마스크 로즈, 피오니", percent: "45%" },
                      { note: "베이스노트", scent: "머스크, 샌달우드", percent: "30%" },
                    ].map((item) => (
                      <div key={item.note} className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                        <div>
                          <span className="text-xs text-slate-500">{item.note}</span>
                          <p className="font-bold text-sm">{item.scent}</p>
                        </div>
                        <span className="text-sm font-black text-yellow-600">{item.percent}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 오른쪽: 향수 이미지 */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-64 h-64 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0_0_black] flex items-center justify-center overflow-hidden">
                    <img src="/제목 없는 디자인 (3)/2.png" alt="향수" className="w-[80%] h-[80%] object-contain" />
                  </div>
                  <div className="absolute -top-3 -right-3 px-4 py-2 bg-yellow-400 text-black font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] text-sm">
                    AI 추천 ✨
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <h3 className="text-2xl font-black text-black mb-2">"Purple Dream"</h3>
                  <p className="text-slate-600">신비롭고 매혹적인 최애의 향기</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================
          진행 과정
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-[#FFFDF5]">
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

          <div className="relative">
            {/* 연결선 (데스크톱) */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-black -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
              {[
                { step: "01", title: "이미지 업로드", desc: "최애 사진을 올려주세요", icon: Camera, color: "bg-yellow-400" },
                { step: "02", title: "정보 입력", desc: "이름과 선호도를 알려주세요", icon: FileText, color: "bg-orange-400" },
                { step: "03", title: "AI 분석", desc: "30초 만에 분석 완료!", icon: Zap, color: "bg-pink-400" },
                { step: "04", title: "레시피 확인", desc: "맞춤 향수를 만나보세요", icon: Gift, color: "bg-purple-400" },
              ].map((item, idx) => (
                <motion.div key={idx} variants={fadeInUp} className="flex flex-col items-center text-center">
                  <div className={`w-20 h-20 ${item.color} border-2 border-black rounded-2xl shadow-[4px_4px_0_0_black] flex items-center justify-center mb-4`}>
                    <item.icon size={32} className="text-white" />
                  </div>
                  <span className="text-3xl font-black text-slate-200 mb-2">{item.step}</span>
                  <h3 className="text-lg font-black text-black mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ============================================
          특별 혜택 섹션
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-gradient-to-br from-yellow-100 to-amber-100 border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-red-500 text-white text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_black] mb-4">
              🎁 SPECIAL BENEFITS
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black">
              지금 주문하시면 드리는 특별 혜택!
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: "실물 분석 보고서",
                desc: "AI가 분석한 최애의 이미지 분석 결과를 예쁜 카드 형태로 제작해 함께 보내드려요!",
                badge: "무료 증정",
                color: "bg-purple-400"
              },
              {
                icon: Shield,
                title: "100% 커스터마이징",
                desc: "공장에서 찍어내는 향수가 아닌, 분석 결과를 바탕으로 1:1 조향사가 직접 블렌딩해요.",
                badge: "프리미엄",
                color: "bg-blue-400"
              },
              {
                icon: Truck,
                title: "2~3일 빠른 배송",
                desc: "주문 후 조향부터 배송까지 2~3일 안에! 기다림 없이 빠르게 받아보세요.",
                badge: "무료 배송",
                color: "bg-green-400"
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0_0_black] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 px-3 py-1 bg-red-500 text-white text-xs font-black border-l-2 border-b-2 border-black rounded-bl-xl">
                  {item.badge}
                </div>
                <div className={`w-14 h-14 ${item.color} border-2 border-black rounded-xl shadow-[3px_3px_0_0_black] flex items-center justify-center mb-4`}>
                  <item.icon size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-black text-black mb-2">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ============================================
          실제 후기
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-white">
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
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black">
              덕후들의 실제 후기
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((review, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-yellow-50 border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0_0_black]"
              >
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-4 leading-relaxed">"{review.text}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-black">{review.name}</p>
                    <p className="text-xs text-slate-500">{review.idol} 분석</p>
                  </div>
                  <div className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                    구매인증
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ============================================
          FAQ
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-[#FFFDF5] border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-3xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-slate-800 text-white text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_#facc15] mb-4">
              ❓ FAQ
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black">
              자주 묻는 질문
            </motion.h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_black]"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left font-black text-black hover:bg-yellow-50 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-yellow-400 border-2 border-black rounded-lg flex items-center justify-center text-sm">Q</span>
                    {faq.q}
                  </span>
                  <ChevronDown size={20} className={`transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 pt-0">
                        <div className="pl-11 text-slate-600 leading-relaxed">{faq.a}</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
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
            덕후라면 반드시 해야 할<br />
            <span className="text-yellow-400">최애 향기 체험</span>
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            최애의 분위기를 향기로 담아, 언제 어디서나 함께하세요.<br />
            지금 바로 시작하면 실물 보고서도 무료!
          </p>

          <button
            onClick={handleStartClick}
            disabled={loading}
            className="inline-flex items-center justify-center gap-3 px-12 py-6 bg-yellow-400 text-black font-black text-xl rounded-2xl border-2 border-black shadow-[8px_8px_0_0_white] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[4px_4px_0_0_white] transition-all disabled:opacity-50"
          >
            <Sparkles size={28} />
            무료로 분석 시작하기
          </button>

          <p className="text-slate-500 mt-6 text-sm">
            분석은 무료! 결과가 마음에 들면 그때 결제하세요 ✨
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
              <div className="relative p-6 pb-4 text-center bg-gradient-to-b from-yellow-50 to-white">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>

                <div className="w-16 h-16 mx-auto mb-4 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg border-2 border-black shadow-[4px_4px_0_0_black]">
                  <AlertTriangle size={28} className="text-black" />
                </div>

                <h2 className="text-xl font-black text-slate-900 mb-2">잠깐! 🤔</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  로그인하지 않으면 분석 결과가<br />
                  <span className="font-bold text-red-500">저장되지 않아요!</span>
                </p>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-y-2 border-black">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-slate-600">로그인하면 분석 결과가 자동 저장돼요</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-slate-600">마이페이지에서 언제든 다시 볼 수 있어요</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">!</span>
                    <span className="text-slate-600">비회원은 페이지를 나가면 결과가 사라져요</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-3">
                <button
                  onClick={handleLoginClick}
                  className="w-full h-14 bg-black text-white rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_#FACC15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#FACC15] transition-all border-2 border-black"
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
        onSuccess={() => {
          setShowAuthModal(false)
          router.push("/input?type=idol_image")
        }}
      />
    </main>
  )
}
