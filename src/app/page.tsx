"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Sparkles, Zap, User, ArrowRight, TrendingUp, Heart, HelpCircle, BarChart3 } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { AuthModal } from "@/components/auth/AuthModal"
import { KitschHero } from "@/components/home/KitschHero"

export default function Home() {
  const router = useRouter()
  const { user, unifiedUser, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [userStats, setUserStats] = useState({ analysisCount: 0, recipeCount: 0 })
  const [statsLoading, setStatsLoading] = useState(false)

  const isLoggedIn = !!(user || unifiedUser)
  const userName = user?.user_metadata?.name || unifiedUser?.name || user?.email?.split('@')[0] || "방문자"

  // 사용자 통계 데이터 가져오기
  const fetchUserStats = useCallback(async () => {
    if (!isLoggedIn) return

    setStatsLoading(true)
    try {
      const fingerprint = typeof window !== 'undefined'
        ? localStorage.getItem('user_fingerprint')
        : null
      const url = fingerprint
        ? `/api/user/data?fingerprint=${encodeURIComponent(fingerprint)}`
        : '/api/user/data'

      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setUserStats({
          analysisCount: data.analyses?.length || 0,
          recipeCount: data.recipes?.length || 0
        })
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserStats()
    }
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
    <main className="relative min-h-screen bg-[#FFFDF5] font-sans selection:bg-pink-200 selection:text-pink-900">
      <Header />

      {/* 1. Hero Section */}
      <KitschHero />

      {/* 2. Dashboard Interface Container */}
      <div className="relative z-10 mt-[100vh] bg-[#FFFDF5] rounded-t-[40px] px-4 md:px-8 py-12 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t-4 border-slate-900 min-h-[800px]">

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">

          {/* =========================================================
                [LEFT COLUMN] MAIN SERVICES & ACTIVITY
            ========================================================= */}
          <div className="flex-1 space-y-10">

            {/* 2.1 Service Header (Greeting) */}
            <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[4px_4px_0px_#000] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  👋 {isLoggedIn ? `반가워요, ${userName}님!` : "나만의 향기를 찾아보세요!"}
                </h2>
                <p className="text-sm text-slate-500 font-bold mt-1">
                  오늘의 기분과 이미지를 향기로 기록해보세요.
                </p>
              </div>
              {!isLoggedIn && (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-[#F472B6] text-white px-5 py-2 rounded-xl border-2 border-slate-900 font-bold text-sm hover:shadow-none shadow-[2px_2px_0px_#000] transition-all"
                >
                  로그인하기
                </button>
              )}
            </div>

            {/* 2.2 Main Programs (Grid) */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="text-yellow-400 fill-yellow-400" />
                <h3 className="text-2xl font-black text-slate-900">추천 프로그램</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card 1: IDOL */}
                <RetroCard
                  title="AI 아이돌 이미지 분석"
                  subtitle="최애의 무드를 향기로 재해석"
                  image="/제목 없는 디자인 (3)/2.png"
                  price="₩ 24,000"
                  accentColor="bg-[#FBCFE8]"
                  tag="POPULAR"
                  tags={["K-POP", "맞춤향수", "AI분석"]}
                  onClick={() => handleCardClick("/programs/idol-image")}
                />

                {/* Card 2: FIGURE */}
                <RetroCard
                  title="피규어 테마 향수"
                  subtitle="캐릭터의 서사를 담은 향"
                  image="/제목 없는 디자인 (3)/1.png"
                  price="₩ 48,000"
                  accentColor="bg-[#A5F3FC]"
                  tag="NEW"
                  tags={["캐릭터", "피규어", "커스텀"]}
                  onClick={() => handleCardClick("/programs/figure")}
                />

                {/* Card 3: PERSONAL (Full Width) */}
                <div className="md:col-span-2">
                  <RetroCard
                    layout="horizontal"
                    title="나만의 퍼스널 센트"
                    subtitle="당신의 이미지를 완성하는 데일리 시그니처 향수"
                    image="/제목 없는 디자인 (3)/3.png"
                    price="₩ 24,000"
                    accentColor="bg-[#C4B5FD]"
                    tag="SIGNATURE"
                    tags={["시그니처", "데일리", "퍼스널"]}
                    onClick={() => handleCardClick("/programs/personal")}
                  />
                </div>
              </div>
            </div>

            {/* 2.3 How It Works (Process) */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="text-blue-400 fill-blue-400" />
                <h3 className="text-2xl font-black text-slate-900">진행 과정 안내</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ProcessStep
                  number="01"
                  text="이미지/키워드 입력"
                  color="bg-white"
                />
                <ProcessStep
                  number="02"
                  text="AI 정밀 분석"
                  color="bg-white"
                />
                <ProcessStep
                  number="03"
                  text="나만의 레시피 도출"
                  color="bg-white"
                />
              </div>
            </div>

          </div>

          {/* =========================================================
                [RIGHT COLUMN] ALERTS & STATUS (SIDEBAR)
            ========================================================= */}
          <div className="w-full lg:w-80 flex flex-col gap-6">

            {/* 3.1 User Profile Widget */}
            <div className="bg-[#FEF9C3] border-2 border-slate-900 rounded-3xl p-6 shadow-[4px_4px_0px_#000]">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center overflow-hidden">
                  {/* Retro Avatar */}
                  <img src="/assets/retro/computer.png" className="w-9 h-9 object-contain" alt="Profile" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-lg">My Page</div>
                  <div className="text-xs text-slate-500 font-bold">나의 분석 기록 확인하기</div>
                </div>
              </div>
              {isLoggedIn && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-white/50 rounded-xl p-2 text-center border border-slate-900/10">
                    <div className="text-xs text-slate-500 font-bold">분석 횟수</div>
                    <div className="font-black text-slate-900">
                      {statsLoading ? (
                        <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                      ) : userStats.analysisCount}
                    </div>
                  </div>
                  <div className="bg-white/50 rounded-xl p-2 text-center border border-slate-900/10">
                    <div className="text-xs text-slate-500 font-bold">보유 레시피</div>
                    <div className="font-black text-slate-900">
                      {statsLoading ? (
                        <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                      ) : userStats.recipeCount}
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={() => isLoggedIn ? router.push('/mypage') : setShowAuthModal(true)}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all shadow-[2px_2px_0px_#F472B6]"
              >
                {isLoggedIn ? "마이페이지로 이동" : "로그인하고 시작하기"}
              </button>
            </div>

            {/* 3.2 Service Statistics Widget (Trust Indicators) */}
            <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[4px_4px_0px_#000]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-black text-slate-900 flex items-center gap-2">
                  <BarChart3 size={18} />
                  서비스 현황
                </h4>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div className="space-y-4">
                <StatItem label="누적 분석 완료" value="10,000+" icon="🧪" />
                <StatItem label="생성된 향기 레시피" value="25,400+" icon="✨" />
                <StatItem label="AI 매칭 정확도" value="98.5%" icon="🎯" />
              </div>
            </div>

            {/* 3.3 Brand Values (Why Us) */}
            <div className="bg-[#E9D5FF] border-2 border-slate-900 rounded-3xl p-6 shadow-[4px_4px_0px_#000]">
              <h4 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                <Heart size={18} className="text-red-500 fill-red-500" />
                Why Ppuduck?
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold">1</div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">단, 30초 만에 완성되는<br />나만의 시그니처 향수</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold">2</div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">이미지와 키워드를 분석하는<br />고도화된 AI 알고리즘</p>
                </li>
              </ul>
            </div>

            {/* 3.4 Help Center Link */}
            <Link href="/cs" className="block group">
              <div className="bg-white border-2 border-slate-900 rounded-2xl p-4 flex items-center justify-between shadow-[2px_2px_0px_#000] group-hover:-translate-y-1 transition-transform">
                <div className="flex items-center gap-3">
                  <HelpCircle className="text-slate-400 group-hover:text-slate-900 transition-colors" />
                  <span className="font-bold text-slate-600 group-hover:text-slate-900">고객센터 / 문의하기</span>
                </div>
                <ArrowRight size={16} className="text-slate-400" />
              </div>
            </Link>

          </div>

        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </main>
  )
}

// ----------------------------------------------------------------------
// SUB-COMPONENTS
// ----------------------------------------------------------------------

function RetroCard({ title, subtitle, image, price, accentColor, tag, tags, layout = "vertical", onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`group relative bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[4px_4px_0px_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer overflow-hidden ${layout === 'horizontal' ? 'flex items-center gap-6' : 'flex flex-col'}`}
    >
      <div className={`absolute top-4 ${layout === 'horizontal' ? 'left-4' : 'right-4'} px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-full tracking-widest uppercase z-10`}>
        {tag}
      </div>

      <div className={`relative ${layout === 'horizontal' ? 'w-1/3 h-40' : 'w-full h-48'} rounded-2xl border-2 border-slate-900 mb-4 overflow-hidden flex-shrink-0 flex items-center justify-center`}>
        <img
          src={image}
          alt={title}
          className="w-[120%] h-[120%] object-contain transition-transform group-hover:scale-110 duration-500"
        />
      </div>

      <div className={`flex-1 ${layout === "horizontal" ? "py-2" : ""}`}>
        <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight group-hover:text-purple-600 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-slate-500 font-bold mb-4">
          {subtitle}
        </p>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((t: string, i: number) => (
              <span
                key={i}
                className={`text-xs px-3 py-1 rounded-full font-bold border-2 border-slate-900 ${accentColor} text-slate-900`}
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="font-black text-xl text-slate-900">{price}</span>
          <button className="w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-colors">
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function StatItem({ label, value, icon }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-xs font-bold text-slate-500">{label}</span>
      </div>
      <span className="font-black text-slate-900">{value}</span>
    </div>
  )
}

function ProcessStep({ number, text, color }: any) {
  return (
    <div className={`${color} border-2 border-slate-900 rounded-2xl p-4 flex items-center gap-4 shadow-[2px_2px_0px_#000]`}>
      <div className="text-3xl font-black text-slate-200">{number}</div>
      <div className="font-bold text-slate-800 leading-tight">{text}</div>
    </div>
  )
}
