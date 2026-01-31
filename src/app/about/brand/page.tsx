"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Sparkles, Heart, Star, TrendingUp } from "lucide-react"
import { Header } from "@/components/layout/Header"

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
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
}

export default function BrandStoryPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FAFAFA] font-sans">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-28 pb-16 px-5 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.3] pointer-events-none" />
        <div className="absolute top-20 -right-20 w-96 h-96 bg-yellow-300 rounded-full blur-3xl opacity-20 animate-pulse" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          {/* Tag */}
          <div className="inline-block px-4 py-2 rounded-full border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6 sm:mb-8 transform -rotate-2">
            <span className="text-xs font-black text-black tracking-widest uppercase flex items-center gap-2">
              <Sparkles size={14} className="text-yellow-500" />
              ABOUT US
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight mb-6 break-keep">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-pink-500 to-purple-500">
              브랜드 스토리
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed break-keep">
            AC'SCENT IDENTITY는 어떻게 시작되었을까요?
          </p>
        </motion.div>
      </section>

      {/* Origin Story */}
      <section className="relative py-16 sm:py-20 px-5 sm:px-6 bg-white border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-4xl mx-auto"
        >
          <div className="mb-12 sm:mb-16 text-center">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mb-6 sm:mb-8 break-keep">
              시작은 이랬습니다
            </h2>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {/* Story 1 */}
            <div className="p-6 sm:p-8 bg-yellow-50 border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center">
                  <Heart size={24} className="text-black fill-black" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3 break-keep">덕질을 향기로 기록하다</h3>
                  <p className="text-slate-600 leading-relaxed text-base sm:text-lg break-keep">
                    "좋아하는 사람을 생각하면 어떤 향이 날까?" 이 단순한 질문에서 시작되었습니다.
                    덕질은 시각과 청각뿐만 아니라 후각으로도 기억될 수 있다는 믿음으로
                    AC'SCENT IDENTITY가 탄생했습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Story 2 */}
            <div className="p-6 sm:p-8 bg-purple-50 border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-400 border-2 border-black rounded-full flex items-center justify-center">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3 break-keep">모두가 자신만의 향을 가질 권리</h3>
                  <p className="text-slate-600 leading-relaxed text-base sm:text-lg break-keep">
                    퍼퓸는 더 이상 소수만의 전유물이 아닙니다. 누구나 쉽고 즐겁게
                    자신만의 시그니처 향을 찾을 수 있어야 한다고 믿습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Story 3 */}
            <div className="p-6 sm:p-8 bg-pink-50 border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-pink-400 border-2 border-black rounded-full flex items-center justify-center">
                  <Star size={24} className="text-white fill-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3 break-keep">기술과 감성의 만남</h3>
                  <p className="text-slate-600 leading-relaxed text-base sm:text-lg break-keep">
                    최신 AI 기술과 퍼퓸 전문가의 노하우를 결합하여,
                    개인화된 향기 경험을 제공합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Values */}
      <section className="relative py-16 sm:py-20 px-5 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mb-4 break-keep">
              우리가 추구하는 가치
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Value 1 */}
            <motion.div variants={fadeInUp} className="relative p-6 sm:p-8 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all">
              <div className="text-4xl sm:text-5xl mb-4">✨</div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3 break-keep">개인화</h3>
              <p className="text-slate-600 leading-relaxed text-base break-keep">
                천편일률적인 추천이 아닌, 당신만을 위한 향기를 찾아드립니다.
              </p>
            </motion.div>

            {/* Value 2 */}
            <motion.div variants={fadeInUp} className="relative p-6 sm:p-8 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all">
              <div className="text-4xl sm:text-5xl mb-4">🎉</div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3 break-keep">즐거움</h3>
              <p className="text-slate-600 leading-relaxed text-base break-keep">
                퍼퓸 찾기가 즐겁고 의미있는 경험이 되도록 만듭니다.
              </p>
            </motion.div>

            {/* Value 3 */}
            <motion.div variants={fadeInUp} className="relative p-6 sm:p-8 bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all">
              <div className="text-4xl sm:text-5xl mb-4">🤝</div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3 break-keep">접근성</h3>
              <p className="text-slate-600 leading-relaxed text-base break-keep">
                누구나 쉽게, 부담 없이 시작할 수 있는 서비스를 만듭니다.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative py-16 sm:py-20 px-5 sm:px-6 bg-white border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mb-4 break-keep">
              함께 만들어가는 성장
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <motion.div variants={fadeInUp} className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-2">10,000+</div>
              <div className="text-xs sm:text-sm font-bold text-slate-600 break-keep">분석 완료</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 break-keep">맞춤</div>
              <div className="text-xs sm:text-sm font-bold text-slate-600 break-keep">퍼퓸 레시피</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-2">95%</div>
              <div className="text-xs sm:text-sm font-bold text-slate-600 break-keep">만족도</div>
            </motion.div>

            <motion.div variants={fadeInUp} className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 break-keep">3가지</div>
              <div className="text-xs sm:text-sm font-bold text-slate-600 break-keep">프로그램</div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="relative py-16 sm:py-20 px-5 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mb-4 sm:mb-6 break-keep">
            당신만의 향기를 찾아보세요
          </h2>
          <p className="text-base sm:text-lg text-slate-600 mb-8 break-keep">
            AC'SCENT IDENTITY와 함께 특별한 향기 여정을 시작하세요.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-5 bg-black text-white rounded-2xl font-black text-lg shadow-[6px_6px_0px_0px_#FACC15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_0px_#FACC15] transition-all border-2 border-black"
            >
              <Sparkles size={20} />
              프로그램 시작하기
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  )
}
