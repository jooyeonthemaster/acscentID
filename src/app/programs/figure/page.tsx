"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Sparkles, Camera, Star, Heart, CheckCircle2, X, AlertTriangle,
  Package, Truck, Gift, Shield, Zap, ChevronDown, ChevronRight,
  Palette, FileText, Box, Droplets, PenTool, Gem
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

// 20개 색상 팔레트
const colorPalette = [
  { id: "c1", name: "체리 레드", hex: "#FF4757" },
  { id: "c2", name: "코랄 핑크", hex: "#FF6B81" },
  { id: "c3", name: "피치", hex: "#FFAB91" },
  { id: "c4", name: "선셋 오렌지", hex: "#FFA502" },
  { id: "c5", name: "레몬 옐로우", hex: "#FFDA79" },
  { id: "c6", name: "민트 그린", hex: "#7BED9F" },
  { id: "c7", name: "에메랄드", hex: "#2ED573" },
  { id: "c8", name: "스카이 블루", hex: "#74B9FF" },
  { id: "c9", name: "오션 블루", hex: "#3742FA" },
  { id: "c10", name: "라벤더", hex: "#A29BFE" },
  { id: "c11", name: "바이올렛", hex: "#9B59B6" },
  { id: "c12", name: "로즈 핑크", hex: "#FFB5BA" },
  { id: "c13", name: "아쿠아", hex: "#81ECEC" },
  { id: "c14", name: "테라코타", hex: "#CD8D7B" },
  { id: "c15", name: "올리브", hex: "#A6BB8D" },
  { id: "c16", name: "모카", hex: "#8D7B68" },
  { id: "c17", name: "아이보리", hex: "#FFF5B5" },
  { id: "c18", name: "쿨 그레이", hex: "#DFE6E9" },
  { id: "c19", name: "차콜", hex: "#636E72" },
  { id: "c20", name: "퓨어 화이트", hex: "#FFFFFF" },
]

export default function FigurePage() {
  const router = useRouter()
  const { user, unifiedUser, loading } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // 색상 선택 토글
  const toggleColor = (colorId: string) => {
    setSelectedColors(prev => {
      if (prev.includes(colorId)) {
        return prev.filter(c => c !== colorId)
      }
      if (prev.length >= 4) {
        return prev // 이미 4개 선택됨
      }
      return [...prev, colorId]
    })
  }

  const isLoggedIn = !!(user || unifiedUser)

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

  const reviews = [
    { name: "피규어덕후", character: "하츠네 미쿠", text: "3D 모델링 퀄리티가 미쳤어요... 직접 색칠하는 재미도 있고 향기까지 최고!", rating: 5 },
    { name: "오타쿠공주", character: "원신 나히다", text: "나히다 피규어 받고 울었어요 ㅠㅠ 향기도 숲속 느낌나서 찰떡이에요", rating: 5 },
    { name: "굿즈수집가", character: "주술회전 고죠", text: "선물용으로 샀는데 친구가 너무 좋아해서 저도 주문했어요ㅋㅋ", rating: 5 },
  ]

  const faqs = [
    { q: "어떤 이미지를 보내야 하나요?", a: "캐릭터의 전신 또는 상반신이 잘 보이는 이미지가 좋아요. 일러스트, 애니메이션 캡처, 게임 스크린샷 모두 가능합니다!" },
    { q: "3D 모델링은 어떤 스타일인가요?", a: "귀여운 '룩업(Look Up)' 스타일로 제작됩니다. SD 캐릭터처럼 2등신~3등신의 아담하고 귀여운 비율이에요." },
    { q: "색칠은 어떻게 하나요?", a: "단색 피규어와 함께 4색 아크릴 마커가 제공됩니다. 마르면 물에 안 지워지는 전문가용이에요. 처음이어도 쉽게 할 수 있어요!" },
    { q: "향기는 얼마나 오래가나요?", a: "샤쉐스톤에 향을 뿌려 사용하시면 약 2-3주 정도 향이 유지됩니다. 리필용 향수도 별도 구매 가능해요." },
  ]

  const productComponents = [
    { icon: Box, name: "3D 모델링 피규어", desc: "룩업 스타일 단색 피규어", color: "bg-cyan-400" },
    { icon: PenTool, name: "4색 아크릴 마커", desc: "선택한 컬러 세트", color: "bg-pink-400" },
    { icon: Gem, name: "샤쉐스톤", desc: "향기를 담는 천연석", color: "bg-purple-400" },
    { icon: Droplets, name: "시그니처 디퓨저", desc: "피규어 전용 스팟", color: "bg-blue-400" },
    { icon: Sparkles, name: "AI 맞춤 향수 5ml", desc: "캐릭터 분석 기반", color: "bg-yellow-400" },
  ]

  return (
    <main className="relative min-h-screen bg-[#F0FDFF] font-sans">
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
                  <span className="px-3 py-1 bg-cyan-400 text-black text-xs font-black rounded-full border-2 border-black">
                    NEW
                  </span>
                  <span className="px-3 py-1 bg-purple-400 text-white text-xs font-black rounded-full border-2 border-black">
                    DIY KIT
                  </span>
                </div>
                <div className="aspect-square flex items-center justify-center p-8 bg-gradient-to-br from-cyan-50 to-blue-50">
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
                <span className="text-black font-bold">3D 피규어 디퓨저</span>
              </div>

              {/* 타이틀 */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 fill-cyan-400 text-cyan-400" />
                  <Star className="w-5 h-5 fill-cyan-400 text-cyan-400" />
                  <Star className="w-5 h-5 fill-cyan-400 text-cyan-400" />
                  <Star className="w-5 h-5 fill-cyan-400 text-cyan-400" />
                  <Star className="w-5 h-5 fill-cyan-400 text-cyan-400" />
                  <span className="text-sm font-bold text-slate-600 ml-1">4.8 (1,203)</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-black leading-tight mb-3">
                  3D 피규어 디퓨저<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500">
                    최애를 직접 만들다
                  </span>
                </h1>
                <p className="text-slate-600 font-medium">
                  AI가 3D로 모델링한 최애 피규어 + 직접 색칠하는 DIY 키트
                </p>
              </div>

              {/* 태그 */}
              <div className="flex flex-wrap gap-2 mb-6">
                {["#3D모델링", "#DIY키트", "#피규어", "#디퓨저", "#덕질굿즈"].map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-cyan-100 text-cyan-800 text-sm font-bold rounded-full border border-cyan-300">
                    {tag}
                  </span>
                ))}
              </div>

              {/* 가격 */}
              <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_black] mb-6">
                <div className="flex items-end gap-3 mb-4">
                  <span className="text-4xl font-black text-black">48,000원</span>
                  <span className="text-lg text-slate-400 line-through">68,000원</span>
                  <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg">29% OFF</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Box size={16} className="text-cyan-600" />
                    <span>3D 모델링 피규어 + 4색 마커 키트</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Truck size={16} className="text-cyan-600" />
                    <span>제작 후 2~3일 배송 (무료배송)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Gift size={16} className="text-cyan-600" />
                    <span className="text-purple-600 font-bold">🎁 샤쉐스톤 + AI 맞춤 향수 포함!</span>
                  </div>
                </div>
              </div>

              {/* 컬러 선택 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-slate-700">🎨 마커 4색 선택</p>
                  <span className={`text-xs font-bold ${selectedColors.length === 4 ? 'text-green-600' : 'text-slate-400'}`}>
                    {selectedColors.length}/4
                  </span>
                </div>
                <div className="grid grid-cols-10 gap-1.5">
                  {colorPalette.map((color) => {
                    const isSelected = selectedColors.includes(color.id)
                    const isDisabled = !isSelected && selectedColors.length >= 4
                    return (
                      <button
                        key={color.id}
                        onClick={() => toggleColor(color.id)}
                        disabled={isDisabled}
                        className={`aspect-square rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-black shadow-[2px_2px_0_0_black] ring-2 ring-cyan-400'
                            : isDisabled
                            ? 'border-transparent opacity-30 cursor-not-allowed'
                            : 'border-transparent hover:border-black'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    )
                  })}
                </div>
              </div>

              {/* CTA 버튼 */}
              <button
                onClick={handleStartClick}
                disabled={loading}
                className="w-full py-5 bg-gradient-to-r from-cyan-400 to-blue-400 text-black font-black text-xl rounded-2xl border-2 border-black shadow-[6px_6px_0_0_black] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_black] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <Camera size={24} />
                최애 이미지로 주문하기
              </button>

              <p className="text-center text-sm text-slate-500 mt-3">
                📸 최애 사진만 보내주세요! AI가 3D로 만들어드려요
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

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {productComponents.map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0_0_black] text-center"
              >
                <div className={`w-12 h-12 ${item.color} border-2 border-black rounded-xl shadow-[2px_2px_0_0_black] flex items-center justify-center mx-auto mb-3`}>
                  <item.icon size={24} className="text-white" />
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
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-purple-400 text-white text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_black] mb-4">
              🎯 TARGET
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black">
              이런 덕후분들께 딱이에요!
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { emoji: "🎨", title: "손으로 만드는 걸 좋아하는 분", desc: "직접 색칠해서 완성하는 DIY의 즐거움!" },
              { emoji: "🏠", title: "덕질 공간을 꾸미고 싶은 분", desc: "피규어 + 향기로 나만의 성지 완성" },
              { emoji: "💝", title: "특별한 굿즈 선물을 찾는 분", desc: "세상에 하나뿐인 커스텀 피규어 선물" },
              { emoji: "✨", title: "시중에 없는 굿즈가 필요한 분", desc: "어떤 캐릭터든 3D로 만들어드려요" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0_0_black] hover:shadow-[6px_6px_0_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
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

          <div className="relative">
            {/* 연결선 */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-black -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
              {[
                { step: "01", title: "이미지 전송", desc: "최애 사진을 업로드해요", icon: Camera, color: "bg-cyan-400" },
                { step: "02", title: "3D 모델링", desc: "AI가 룩업 스타일로 제작", icon: Box, color: "bg-blue-400" },
                { step: "03", title: "향기 분석", desc: "캐릭터에 맞는 향 조향", icon: Sparkles, color: "bg-purple-400" },
                { step: "04", title: "키트 배송", desc: "풀 패키지로 배송!", icon: Truck, color: "bg-pink-400" },
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
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-pink-400 text-white text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_black] mb-4">
              🎁 RESULT PREVIEW
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black mb-4">
              이렇게 완성돼요!
            </motion.h2>
          </div>

          <motion.div variants={fadeInUp} className="bg-gradient-to-br from-cyan-50 to-purple-50 border-2 border-black rounded-3xl p-6 md:p-10 shadow-[8px_8px_0_0_black]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

              {/* 왼쪽: 완성 과정 */}
              <div className="space-y-4">
                <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_black]">
                  <h4 className="font-black text-lg mb-4 flex items-center gap-2">
                    <PenTool size={20} className="text-pink-500" />
                    DIY 색칠 과정
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 text-center">
                      <div className="w-16 h-16 mx-auto bg-slate-100 rounded-xl border-2 border-black mb-2 flex items-center justify-center">
                        <span className="text-2xl">⬜</span>
                      </div>
                      <p className="text-xs font-bold text-slate-500">단색 피규어</p>
                    </div>
                    <div className="text-2xl">→</div>
                    <div className="flex-1 text-center">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-pink-200 to-purple-200 rounded-xl border-2 border-black mb-2 flex items-center justify-center">
                        <span className="text-2xl">🎨</span>
                      </div>
                      <p className="text-xs font-bold text-slate-500">직접 색칠</p>
                    </div>
                    <div className="text-2xl">→</div>
                    <div className="flex-1 text-center">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-cyan-200 to-blue-200 rounded-xl border-2 border-black mb-2 flex items-center justify-center">
                        <span className="text-2xl">✨</span>
                      </div>
                      <p className="text-xs font-bold text-slate-500">완성!</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_black]">
                  <h4 className="font-black text-lg mb-3 flex items-center gap-2">
                    <Droplets size={20} className="text-blue-500" />
                    디퓨저 사용법
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3 p-2 bg-cyan-50 rounded-lg">
                      <span className="w-6 h-6 bg-cyan-400 text-white rounded-full flex items-center justify-center text-xs font-bold border border-black">1</span>
                      <span>샤쉐스톤을 디퓨저 스팟에 올려요</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-cyan-50 rounded-lg">
                      <span className="w-6 h-6 bg-cyan-400 text-white rounded-full flex items-center justify-center text-xs font-bold border border-black">2</span>
                      <span>AI 맞춤 향수를 스톤에 뿌려요</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-cyan-50 rounded-lg">
                      <span className="w-6 h-6 bg-cyan-400 text-white rounded-full flex items-center justify-center text-xs font-bold border border-black">3</span>
                      <span>피규어와 함께 전시하면 끝! 💕</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 오른쪽: 완성품 이미지 */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-64 h-64 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0_0_black] flex items-center justify-center overflow-hidden">
                    <img src="/제목 없는 디자인 (3)/1.png" alt="완성품" className="w-[80%] h-[80%] object-contain" />
                  </div>
                  <div className="absolute -top-3 -right-3 px-4 py-2 bg-cyan-400 text-black font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] text-sm">
                    3D 제작 ✨
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <h3 className="text-2xl font-black text-black mb-2">나만의 최애 피규어</h3>
                  <p className="text-slate-600">세상에 하나뿐인 DIY 굿즈 완성!</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================
          특별 혜택
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-gradient-to-br from-cyan-100 to-blue-100 border-y-2 border-black">
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
              지금 주문 시 특별 혜택!
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Box,
                title: "AI 3D 모델링",
                desc: "전문 툴로 제작하는 고퀄리티 룩업 스타일 피규어. 어떤 캐릭터든 귀엽게!",
                badge: "프리미엄",
                color: "bg-cyan-400"
              },
              {
                icon: PenTool,
                title: "프리미엄 마커 세트",
                desc: "물에 안 지워지는 전문가용 아크릴 마커 4색. 초보자도 쉽게!",
                badge: "4색 포함",
                color: "bg-pink-400"
              },
              {
                icon: Sparkles,
                title: "AI 맞춤 향수",
                desc: "캐릭터 이미지를 분석해 어울리는 향을 조향. 5ml 제공!",
                badge: "무료 증정",
                color: "bg-purple-400"
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
                className="bg-cyan-50 border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0_0_black]"
              >
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} size={16} className="fill-cyan-400 text-cyan-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-4 leading-relaxed">"{review.text}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-black">{review.name}</p>
                    <p className="text-xs text-slate-500">{review.character} 제작</p>
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
      <section className="py-16 px-4 md:px-8 bg-[#F0FDFF] border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-3xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-slate-800 text-white text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_#22d3ee] mb-4">
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
                  className="w-full px-6 py-5 flex items-center justify-between text-left font-black text-black hover:bg-cyan-50 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-cyan-400 border-2 border-black rounded-lg flex items-center justify-center text-sm text-white">Q</span>
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
        onSuccess={() => {
          setShowAuthModal(false)
          router.push("/input?type=figure")
        }}
      />
    </main>
  )
}
