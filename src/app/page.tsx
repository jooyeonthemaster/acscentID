"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

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
      staggerChildren: 0.2,
      delayChildren: 0.3
    }
  }
}

export default function Home() {
  return (
    <main className="relative flex flex-col items-center min-h-screen p-6 overflow-hidden bg-[#FAFAFA] font-sans">

      {/* Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none bg-[#FDFDFD]">
        <div className="absolute inset-0 z-40 bg-noise opacity-[0.4] mix-blend-overlay pointer-events-none" />
        <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] opacity-40 blur-[100px] saturate-150">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply animate-blob" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply animate-blob animation-delay-2000" />
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply animate-blob animation-delay-4000" />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-full px-2 sm:max-w-[420px] sm:px-0 md:max-w-[380px] lg:max-w-[340px] flex flex-col gap-8">

        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="text-left space-y-3 pt-6"
        >
          <div className="flex items-center gap-2">
            <span className="h-[1px] w-8 bg-yellow-500/60"></span>
            <p className="text-[10px] font-bold text-yellow-600/80 tracking-[0.2em] uppercase">
              Signature Scent Curation
            </p>
          </div>
          <h1 className="text-[3rem] font-black text-slate-900 leading-[0.95] tracking-tight">
            AC&apos;SCENT<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600">
              IDENTITY
            </span>
          </h1>
        </motion.div>

        {/* Vertical Card List */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-5 w-full"
        >
          {/* Card 1: AI 이미지 분석 */}
          <MenuCard
            href="/input?type=idol_image"
            category="[뿌리는 덕질]"
            title="AI 이미지 분석"
            description="아이돌 이미지로 향수 추천"
            image="/제목 없는 디자인 (3)/1.png"
            gradientFrom="#FFF8E7"
            gradientTo="#FFEFC2"
          />

          {/* Card 2: 피규어 화분 X SPOT */}
          <MenuCard
            href="/input?type=figure"
            category="[뿌리는 덕질]"
            title="피규어 화분 X SPOT"
            description="피규어와 어울리는 향기"
            image="/제목 없는 디자인 (3)/2.png"
            gradientFrom="#EEF4FF"
            gradientTo="#D4E4FF"
          />

          {/* Card 3: AI 분석 */}
          <MenuCard
            href="/input?type=personal"
            category="퍼스널 센트"
            title="AI 분석"
            description="나만의 시그니처 향기 찾기"
            image="/제목 없는 디자인 (3)/3.png"
            gradientFrom="#1E293B"
            gradientTo="#0F172A"
            isDark
          />
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="w-full text-center pb-6"
        >
          <span className="text-[9px] font-semibold text-slate-400/80 tracking-[0.3em] uppercase">
            © 2025 Ac&apos;scent Identity
          </span>
        </motion.div>

      </div>
    </main>
  )
}

// --- Menu Card Component (이미지 위에 카드 오버레이) ---
interface MenuCardProps {
  href: string
  category: string
  title: string
  description: string
  image: string
  gradientFrom: string
  gradientTo: string
  isDark?: boolean
}

function MenuCard({ href, category, title, description, image, gradientFrom, gradientTo, isDark = false }: MenuCardProps) {
  return (
    <motion.div variants={fadeInUp}>
      <Link href={href} className="block group">
        <div className="relative w-full h-[180px] rounded-[1.5rem] overflow-hidden">
          {/* 배경 이미지 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />

          {/* 그라디언트 오버레이 (카드 배경) */}
          <div
            className="absolute inset-0 opacity-90 group-hover:opacity-85 transition-opacity duration-300"
            style={{
              background: `linear-gradient(135deg, ${gradientFrom}ee 0%, ${gradientTo}dd 100%)`
            }}
          />

          {/* 텍스트 콘텐츠 */}
          <div className="relative z-10 h-full p-6 flex flex-col justify-between">
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-yellow-400' : 'text-slate-500'}`}>
                {category}
              </span>
              <h3 className={`mt-2 font-bold text-2xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {title}
              </h3>
              <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {description}
              </p>
            </div>

            {/* 화살표 버튼 */}
            <div className="flex justify-end">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                isDark
                  ? 'bg-white/10 text-white group-hover:bg-yellow-400 group-hover:text-black'
                  : 'bg-slate-900/10 text-slate-700 group-hover:bg-slate-900 group-hover:text-white'
              }`}>
                <ArrowRight size={18} />
              </div>
            </div>
          </div>

          {/* Shine Effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-20">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-100%] group-hover:animate-shine" />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
