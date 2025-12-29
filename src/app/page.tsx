"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Sparkles, Heart, Star, X, AlertTriangle } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { AuthModal } from "@/components/auth/AuthModal"

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
    }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  // 카드 클릭 핸들러
  const handleCardClick = (href: string) => {
    if (loading) return

    if (user) {
      // 로그인된 사용자는 바로 이동
      router.push(href)
    } else {
      // 비로그인 사용자는 모달 표시
      setPendingHref(href)
      setShowLoginPrompt(true)
    }
  }

  // 비회원으로 시작
  const handleGuestStart = () => {
    if (pendingHref) {
      router.push(pendingHref)
    }
    setShowLoginPrompt(false)
  }

  // 로그인하기 선택
  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  return (
    <main className="relative flex flex-col min-h-screen overflow-hidden bg-[#FAFAFA] font-sans">

      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 bg-grid-pattern opacity-[0.4] pointer-events-none" />

      {/* Top Marquee moved to Header */}

      <Header />

      <div className="relative z-10 w-full max-w-7xl px-6 mx-auto flex-1 flex flex-col justify-center lg:flex-row lg:items-center lg:justify-between gap-12 pt-20 pb-10">

        {/* Left Column: Hero */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="flex-1 text-left relative"
        >
          {/* Decorative Floaters */}
          <div className="absolute -top-20 -left-10 animate-float hidden lg:block">
            <Star size={48} className="text-yellow-400 fill-yellow-400 drop-shadow-md" />
          </div>
          <div className="absolute top-10 right-10 animate-float-delayed hidden lg:block">
            <Heart size={40} className="text-pink-400 fill-pink-400 drop-shadow-md" />
          </div>

          <div className="inline-block px-4 py-1.5 rounded-full border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6 transform -rotate-2">
            <span className="text-xs font-black text-black tracking-widest uppercase flex items-center gap-2">
              <Sparkles size={14} className="text-yellow-500" />
              Signature Scent Curation
            </span>
          </div>

          <h1 className="text-[3.5rem] sm:text-[4.5rem] lg:text-[6.5rem] font-black text-slate-900 leading-[0.9] tracking-tighter mb-6 relative">
            <span className="relative z-10">AC&apos;SCENT</span><br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 relative z-10">
              IDENTITY
            </span>
            {/* Behind text blob */}
            <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-yellow-300 rounded-full blur-2xl opacity-50 -z-10 animate-pulse" />
          </h1>

          <p className="max-w-md text-slate-600 text-lg font-medium leading-relaxed bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-slate-200/50">
            <span className="font-bold text-slate-900">덕질을 향기로 기록하다.</span><br />
            최애의 이미지, 분위기, 성격을 분석하여<br />
            세상에 하나뿐인 시그니처 향수를 추천해드립니다.
          </p>
        </motion.div>

        {/* Right Column: Menu Grid (Polco Style) */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex-1 w-full max-w-md lg:max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-6 p-4"
        >
          {/* Card 1 */}
          <div className="sm:col-span-2 transform hover:rotate-1 transition-transform duration-300">
            <MenuCard
              href="/input?type=idol_image"
              tag="BEST"
              title="AI 이미지 분석"
              description="최애의 레전드 짤로 찾는 향수"
              image="/제목 없는 디자인 (3)/1.png"
              color="bg-yellow-50"
              accentColor="bg-yellow-400"
              icon={<Star className="text-yellow-600" />}
              onClick={handleCardClick}
            />
          </div>

          {/* Card 2 */}
          <div className="transform hover:-rotate-1 transition-transform duration-300">
            <MenuCard
              href="/input?type=figure"
              tag="GOODS"
              title="피규어 화분"
              description="캐릭터 테마 향기"
              image="/제목 없는 디자인 (3)/2.png"
              color="bg-blue-50"
              accentColor="bg-blue-400"
              icon={<Heart className="text-blue-600" />}
              onClick={handleCardClick}
            />
          </div>

          {/* Card 3 */}
          <div className="transform hover:rotate-1 transition-transform duration-300">
            <MenuCard
              href="/input?type=personal"
              tag="ANALYSIS"
              title="퍼스널 센트"
              description="나만의 시그니처"
              image="/제목 없는 디자인 (3)/3.png"
              color="bg-purple-50"
              accentColor="bg-purple-400"
              icon={<Sparkles className="text-purple-600" />}
              onClick={handleCardClick}
            />
          </div>
        </motion.div>

        {/* Footer */}
        <div className="absolute bottom-6 left-0 w-full text-center lg:text-left lg:px-6 pointer-events-none z-10">
          <span className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase bg-white/80 px-2 py-1 rounded-full">
            © 2025 Ac&apos;scent Identity
          </span>
        </div>

      </div>

      {/* 로그인 안내 모달 */}
      <AnimatePresence>
        {showLoginPrompt && (
          <>
            {/* 백드롭 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginPrompt(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* 모달 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-black"
            >
              {/* 헤더 */}
              <div className="relative p-6 pb-4 text-center bg-gradient-to-b from-amber-50 to-white">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>

                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-400/30 border-2 border-black">
                  <AlertTriangle size={28} className="text-white" />
                </div>

                <h2 className="text-xl font-black text-slate-900 mb-2">잠깐! 🤔</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  로그인하지 않으면 분석 결과가<br />
                  <span className="font-bold text-red-500">저장되지 않아요!</span>
                </p>
              </div>

              {/* 안내 내용 */}
              <div className="px-6 py-4 bg-slate-50 border-y border-slate-200">
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

              {/* 버튼 */}
              <div className="p-6 space-y-3">
                {/* 로그인/회원가입 버튼 */}
                <button
                  onClick={handleLoginClick}
                  className="w-full h-14 bg-black text-white rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_#FACC15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:bg-slate-800 border-2 border-black"
                >
                  로그인 / 회원가입
                </button>

                {/* 비회원 시작 버튼 */}
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
          if (pendingHref) {
            router.push(pendingHref)
          }
        }}
      />
    </main>
  )
}

// --- Menu Card (Kitsch Polco Style) ---
interface MenuCardProps {
  href: string
  tag: string
  title: string
  description: string
  image: string
  color: string
  accentColor: string
  icon: React.ReactNode
  onClick?: (href: string) => void
}

function MenuCard({ href, tag, title, description, image, color, accentColor, icon, onClick }: MenuCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault()
      onClick(href)
    }
  }

  return (
    <Link href={href} onClick={handleClick} className="block group relative">
      <div className={`relative overflow-hidden rounded-[2rem] border-2 border-black box-shadow-hard group-hover:box-shadow-hard-lg transition-all duration-300 ${color} h-[220px] sm:h-[260px]`}>

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-10 border-b-2 border-black bg-white flex items-center px-4 justify-between z-10">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full border border-black bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full border border-black bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full border border-black bg-green-400" />
          </div>
          <span className="text-[10px] font-black tracking-widest">{tag}</span>
        </div>

        {/* Content */}
        <div className="relative h-full pt-10 flex flex-col items-center justify-center p-6 text-center group-hover:scale-105 transition-transform duration-500">
          {/* Image Circle */}
          <div className="w-24 h-24 rounded-full border-2 border-black overflow-hidden mb-3 bg-white shadow-md relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
          </div>

          <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 transition-all">
            {title}
          </h3>
          <p className="text-sm font-bold text-slate-500">
            {description}
          </p>
        </div>

        {/* Sticker Decoration */}
        <div className="absolute bottom-3 right-3 transform rotate-12 group-hover:rotate-45 transition-transform duration-300">
          <div className={`w-10 h-10 ${accentColor} border-2 border-black rounded-full flex items-center justify-center`}>
            {icon}
          </div>
        </div>

        {/* Shine Overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 pointer-events-none bg-white mix-blend-overlay transition-opacity" />
      </div>
    </Link>
  )
}
