"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Sparkles, User, Star, CheckCircle2, X, AlertTriangle,
  ChevronRight, ChevronDown, Package, Truck, Gift, Shield,
  FileText, Droplets, Clock, Heart
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

export default function PersonalPage() {
  const router = useRouter()
  const { user, unifiedUser, loading } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const isLoggedIn = !!(user || unifiedUser)

  const productImages = [
    "/제목 없는 디자인 (4)/1.png",
    "/제목 없는 디자인 (4)/2.png",
    "/제목 없는 디자인 (4)/3.png",
  ]

  const handleStartClick = () => {
    if (loading) return
    if (isLoggedIn) {
      router.push("/input?type=personal")
    } else {
      setShowLoginPrompt(true)
    }
  }

  const handleGuestStart = () => {
    router.push("/input?type=personal")
    setShowLoginPrompt(false)
  }

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  const reviews = [
    { name: "퍼퓸초보", rating: 5, text: "처음 써보는 퍼퓸인데 제 스타일이랑 너무 잘 맞아서 놀랐어요!" },
    { name: "직장인A", rating: 5, text: "출근할 때 뿌리니까 하루종일 기분 좋아요. 은은해서 좋음" },
    { name: "선물러", rating: 5, text: "여자친구한테 선물했는데 진짜 본인한테 딱 맞는다고 감동받음ㅋㅋ" },
  ]

  const faqs = [
    { q: "어떤 정보를 입력해야 하나요?", a: "본인을 표현하는 키워드, 선호 스타일, 좋아하는 분위기 등을 입력해주시면 됩니다. 사진 없이 텍스트만으로도 충분해요!" },
    { q: "퍼퓸는 어떤 타입인가요?", a: "10ml 스프레이 타입으로 제공됩니다. 휴대하기 좋고 은은하게 발향되어 일상에서 사용하기 좋아요." },
    { q: "분석은 얼마나 걸리나요?", a: "AI 분석은 즉시 완료됩니다. 결과를 확인하신 후 마음에 드시면 주문하시면 돼요." },
    { q: "환불이 가능한가요?", a: "맞춤 제작 상품 특성상 제작 시작 후에는 환불이 어렵습니다. 분석 결과를 충분히 확인 후 주문해주세요." },
  ]

  const productIncludes = [
    { icon: FileText, name: "퍼스널리티 리포트", desc: "AI 분석 결과" },
    { icon: Star, name: "TOP 3 추천", desc: "맞춤 퍼퓸 추천" },
    { icon: Droplets, name: "시그니처 퍼퓸 10ml", desc: "스프레이 타입" },
    { icon: Package, name: "프리미엄 패키징", desc: "선물용 박스" },
  ]

  return (
    <main className="relative min-h-screen bg-[#FAFAFA] font-sans">
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
              <div className="relative bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[8px_8px_0_0_black] mb-4">
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  <span className="px-3 py-1 bg-black text-white text-xs font-black rounded-full border-2 border-black">
                    SIGNATURE
                  </span>
                  <span className="px-3 py-1 bg-white text-black text-xs font-black rounded-full border-2 border-black">
                    PREMIUM
                  </span>
                </div>
                <div className="aspect-square flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-gray-100">
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
                        : 'border-slate-300 hover:border-black'
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
                <span className="text-black font-bold">퍼스널 센트</span>
              </div>

              {/* 타이틀 */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="w-5 h-5 fill-black text-black" />
                  ))}
                  <span className="text-sm font-bold text-slate-600 ml-1">4.9 (2,847)</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-black leading-tight mb-3">
                  퍼스널 센트<br />
                  <span className="text-slate-500">
                    나를 위한 시그니처 향
                  </span>
                </h1>
                <p className="text-slate-600 font-medium">
                  AI가 분석한 당신만의 퍼스널리티에 맞는 시그니처 퍼퓸
                </p>
              </div>

              {/* 태그 */}
              <div className="flex flex-wrap gap-2 mb-6">
                {["#퍼스널리티", "#시그니처향", "#AI분석", "#맞춤퍼퓸", "#입문추천"].map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-bold rounded-full border border-slate-300">
                    {tag}
                  </span>
                ))}
              </div>

              {/* 가격 */}
              <div className="bg-white border-2 border-black rounded-xl p-5 shadow-[4px_4px_0_0_black] mb-6">
                <div className="flex items-end gap-3 mb-4">
                  <span className="text-4xl font-black text-black">24,000원</span>
                  <span className="text-lg text-slate-400 line-through">34,000원</span>
                  <span className="px-2 py-1 bg-black text-white text-xs font-bold rounded-lg">30% OFF</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Droplets size={16} className="text-black" />
                    <span>맞춤 퍼퓸 10ml (스프레이 타입)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Truck size={16} className="text-black" />
                    <span>제작 후 2~3일 배송 (배송비 3,000원)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Gift size={16} className="text-black" />
                    <span className="font-bold">🎁 퍼스널리티 리포트 무료 증정!</span>
                  </div>
                </div>
              </div>

              {/* 용량 선택 */}
              <div className="mb-6">
                <p className="text-sm font-bold text-slate-700 mb-3">📦 용량 선택</p>
                <div className="flex gap-3">
                  <button className="flex-1 p-4 rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] bg-white text-center">
                    <p className="text-lg font-black">10ml</p>
                    <p className="text-sm text-slate-500">24,000원</p>
                  </button>
                  <button className="flex-1 p-4 rounded-xl border-2 border-slate-200 hover:border-black bg-white/50 text-center transition-all">
                    <p className="text-lg font-bold text-slate-600">50ml</p>
                    <p className="text-sm text-slate-400">48,000원</p>
                  </button>
                </div>
              </div>

              {/* CTA 버튼 */}
              <button
                onClick={handleStartClick}
                disabled={loading}
                className="w-full py-5 bg-black text-white font-black text-xl rounded-xl border-2 border-black shadow-[6px_6px_0_0_#666] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_#666] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <User size={24} />
                퍼스널리티 분석 시작하기
              </button>

              <p className="text-center text-sm text-slate-500 mt-3">
                ✨ 나를 표현하는 키워드만 입력하면 끝!
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
            {productIncludes.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <item.icon size={18} className="text-slate-400" />
                <span className="font-bold text-sm">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          구성품 상세
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-gradient-to-b from-[#FAFAFA] to-white">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-black text-white text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_#666] mb-4">
              📦 PACKAGE
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black">
              패키지 구성품
            </motion.h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {productIncludes.map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0_0_black] text-center"
              >
                <div className="w-12 h-12 bg-slate-100 border-2 border-black rounded-lg shadow-[2px_2px_0_0_black] flex items-center justify-center mx-auto mb-3">
                  <item.icon size={24} className="text-black" />
                </div>
                <h3 className="font-black text-sm text-black mb-1">{item.name}</h3>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ============================================
          이런 분께 추천
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-white border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-slate-200 text-black text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_black] mb-4">
              🎯 TARGET
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black">
              이런 분들께 추천해요!
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { emoji: "🌱", title: "퍼퓸 입문자", desc: "처음 시작하는 분께 가장 추천!" },
              { emoji: "🎁", title: "특별한 선물을 찾는 분", desc: "세상에 하나뿐인 맞춤 퍼퓸 선물" },
              { emoji: "💼", title: "나만의 이미지를 원하는 분", desc: "프로페셔널한 시그니처 향" },
              { emoji: "🔍", title: "내 취향을 알고 싶은 분", desc: "AI가 분석하는 퍼스널리티" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-gradient-to-br from-slate-50 to-gray-100 border-2 border-black rounded-xl p-6 shadow-[4px_4px_0_0_black] hover:shadow-[6px_6px_0_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
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
          진행 과정
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-[#FAFAFA]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-slate-800 text-white text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_#444] mb-4">
              📋 PROCESS
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black">
              어떻게 진행되나요?
            </motion.h2>
          </div>

          <div className="relative">
            {/* 연결선 */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-black -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
              {[
                { step: "01", title: "정보 입력", desc: "나를 표현하는 키워드 입력", icon: User },
                { step: "02", title: "AI 분석", desc: "퍼스널리티 종합 분석", icon: Sparkles },
                { step: "03", title: "퍼퓸 추천", desc: "TOP 3 시그니처 향 추천", icon: Star },
                { step: "04", title: "제품 배송", desc: "맞춤 퍼퓸 제작 & 배송", icon: Truck },
              ].map((item, idx) => (
                <motion.div key={idx} variants={fadeInUp} className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0_0_black] flex items-center justify-center mb-4">
                    <item.icon size={32} className="text-black" />
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
          결과물 미리보기
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
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-slate-100 text-black text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_black] mb-4">
              📊 RESULT PREVIEW
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black mb-4">
              이런 결과를 받아요!
            </motion.h2>
          </div>

          <motion.div variants={fadeInUp} className="bg-gradient-to-br from-slate-50 to-gray-100 border-2 border-black rounded-2xl p-6 md:p-10 shadow-[8px_8px_0_0_black]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

              {/* 왼쪽: 분석 결과 */}
              <div className="space-y-4">
                <div className="bg-white border-2 border-black rounded-xl p-5 shadow-[4px_4px_0_0_black]">
                  <h4 className="font-black text-lg mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-black" />
                    퍼스널리티 프로파일
                  </h4>
                  <div className="space-y-3">
                    {["이미지 분석", "성격 유형", "선호 스타일", "어울리는 향조"].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                        <CheckCircle2 size={16} className="text-black" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border-2 border-black rounded-xl p-5 shadow-[4px_4px_0_0_black]">
                  <h4 className="font-black text-lg mb-3 flex items-center gap-2">
                    <Star size={20} className="text-black" />
                    TOP 3 퍼퓸 추천
                  </h4>
                  <div className="space-y-2">
                    {["1위: 시그니처 머스크", "2위: 우디 앰버", "3위: 시트러스 프레시"].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg text-sm">
                        <span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                        <span>{item.split(": ")[1]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 오른쪽: 완성품 이미지 */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-64 h-64 bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0_0_black] flex items-center justify-center overflow-hidden">
                    <img src="/제목 없는 디자인 (4)/1.png" alt="완성품" className="w-[80%] h-[80%] object-contain" />
                  </div>
                  <div className="absolute -top-3 -right-3 px-4 py-2 bg-black text-white font-black rounded-full border-2 border-black text-sm">
                    YOUR SCENT ✨
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <h3 className="text-2xl font-black text-black mb-2">나만의 시그니처</h3>
                  <p className="text-slate-600">세상에 하나뿐인 맞춤 퍼퓸</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================
          실제 후기
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-[#FAFAFA]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-slate-300 text-black text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_black] mb-4">
              💬 REAL REVIEWS
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black">
              실제 사용 후기
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((review, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-white border-2 border-black rounded-xl p-6 shadow-[4px_4px_0_0_black]"
              >
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} size={16} className="fill-black text-black" />
                  ))}
                </div>
                <p className="text-slate-700 mb-4 leading-relaxed">"{review.text}"</p>
                <div className="flex items-center justify-between">
                  <p className="font-black text-black">{review.name}</p>
                  <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
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
      <section className="py-16 px-4 md:px-8 bg-white border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-3xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-slate-800 text-white text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_#444] mb-4">
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
                className="bg-slate-50 border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0_0_black]"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left font-black text-black hover:bg-slate-100 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-black text-white border-2 border-black rounded-lg flex items-center justify-center text-sm">Q</span>
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
            당신만의<br />
            <span className="text-slate-400">시그니처 향을 찾아보세요</span>
          </h2>
          <p className="text-slate-500 mb-8 text-lg">
            AI가 분석하는 퍼스널리티 기반 맞춤 퍼퓸.<br />
            결제는 분석 결과가 마음에 드실 때만!
          </p>

          <button
            onClick={handleStartClick}
            disabled={loading}
            className="inline-flex items-center justify-center gap-3 px-12 py-6 bg-white text-black font-black text-xl rounded-xl border-2 border-black shadow-[8px_8px_0_0_#666] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[4px_4px_0_0_#666] transition-all disabled:opacity-50"
          >
            <Sparkles size={28} />
            지금 바로 시작하기
          </button>

          <p className="text-slate-600 mt-6 text-sm">
            분석 소요시간: 약 2분 ⚡
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
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-black"
            >
              <div className="relative p-6 pb-4 text-center bg-gradient-to-b from-slate-100 to-white">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>

                <div className="w-16 h-16 mx-auto mb-4 bg-black rounded-xl flex items-center justify-center shadow-lg border-2 border-black shadow-[4px_4px_0_0_#666]">
                  <AlertTriangle size={28} className="text-white" />
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
                  className="w-full h-14 bg-black text-white rounded-xl font-bold text-lg shadow-[4px_4px_0px_0px_#666] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#666] transition-all border-2 border-black"
                >
                  로그인 / 회원가입
                </button>

                <button
                  onClick={handleGuestStart}
                  className="w-full h-12 bg-white text-slate-600 rounded-xl font-semibold border-2 border-slate-300 hover:bg-slate-50 hover:border-black transition-all flex items-center justify-center gap-2"
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
        redirectPath="/input?type=personal&mode=online"
      />
    </main>
  )
}
